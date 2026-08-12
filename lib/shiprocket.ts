/**
 * lib/shiprocket.ts
 * Shiprocket API wrapper.
 * - Authenticates via email + password → bearer token
 * - Caches token in memory (valid ~10 days, we refresh after 9)
 * - Exposes createShiprocketOrder()
 */

import { Order } from "@/lib/models/order";
import "@/lib/models/product";  

// Strips spaces/dashes/parens/country-code prefixes and returns a clean
// 10-digit Indian mobile number, or "" if it can't be normalized to one.
// Kept here too (not just in app/api/orders/route.ts) as a defensive
// second layer — this function is a shared module that other callers
// (admin retry actions, migrations, cron jobs) may invoke directly, and
// it shouldn't assume every caller already sanitized the phone before
// saving it to the order.
function sanitizePhone(raw: string | undefined | null): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? digits : "";
}

export async function autoCreateShiprocketOrder(orderId: string) {
  const order = await Order.findById(orderId).populate("items.product");
  if (!order) {
    console.error(`Auto Shiprocket: order ${orderId} not found`);
    return;
  }
  if (order.shiprocketOrderId) return;

  const addr = order.shippingAddress;
   const items = order.items.map((item: any) => {
    // Prefer the selected size's own weight/dimensions; fall back to the
    // base product's if this size has none set (e.g. older sizes that
    // haven't been backfilled/edited yet).
    const size = item.selectedSize;
    const matchedSize = size?.size
      ? item.product?.sizes?.find((s: any) => s.size === size.size)
      : null;

    return {
      name: item.product?.name ?? "Product",
      sku: item.product?.sku?.trim() || `NEZAL-${item.product?._id ?? "UNKNOWN"}`,
      units: item.quantity,
      selling_price: item.price,
      weight: matchedSize?.weight ?? item.product?.weight ?? 0.3,
      gstPercent: item.product?.gstPercent ?? 0,
      hsn: item.product?.hsn ?? "",
      length: matchedSize?.length ?? item.product?.length ?? 10,
      breadth: matchedSize?.breadth ?? item.product?.breadth ?? 10,
      height: matchedSize?.height ?? item.product?.height ?? 10,
    };
  });

  // ── DEBUG: exactly what per-item dimensions/weight we pulled from products ─
  console.log("[Shiprocket:autoCreateOrder] Order items with dimensions:", JSON.stringify(items, null, 2));

  const cleanPhone = sanitizePhone(addr?.phone ?? order.guestPhone);

  if (!cleanPhone) {
    // Don't even attempt the Shiprocket call with a phone we know will be
    // rejected — mark the order so it surfaces in admin instead of failing
    // silently (or, if something upstream ever retries this function,
    // failing identically on every retry forever).
    console.error(
      `Auto Shiprocket: order ${order._id} has an invalid phone ("${addr?.phone ?? order.guestPhone}"), skipping creation`
    );
    await Order.findByIdAndUpdate(order._id, {
      shippingStatus: "needs_attention",
      shiprocketError: "Invalid phone number — could not create shipment. Please correct the phone number and retry from admin.",
    });
    return;
  }

  const shippingAddress = {
    name: addr?.name ?? order.guestName ?? "Customer",
    phone: cleanPhone,
    email: order.guestEmail ?? addr?.email ?? "",
    address: addr?.address ?? addr?.street ?? "",
    city: addr?.city ?? "",
    state: addr?.state ?? "",
    pincode: String(addr?.pincode ?? addr?.zipCode ?? ""),
    country: addr?.country ?? "India",
  };

  try {
    const goodsTotal = order.items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    const result = await createShiprocketOrder({
      orderId: order._id.toString(),
      orderDate: new Date(order.createdAt).toISOString().split("T")[0],
      items,
      shipping: shippingAddress,
      billing: shippingAddress,
      paymentMethod: order.paymentMethod === "cod" ? "COD" : "Prepaid",
      subTotal: goodsTotal,
      shippingCharges: order.shippingAmount ?? 0,
      totalDiscount: order.discountAmount ?? 0,
      // Our own COD handling fee, charged to the customer at checkout but
      // previously never forwarded to Shiprocket — Shiprocket's order
      // value (and therefore the COD amount collected on delivery) is
      // sub_total + shipping_charges, so without this the ₹50 fee was
      // silently dropped and never actually collected from the customer.
      codCharge: order.codCharge ?? 0,
    });

    await Order.findByIdAndUpdate(order._id, {
      shiprocketOrderId: result.shiprocketOrderId,
      shiprocketShipmentId: result.shiprocketShipmentId,
      awbCode: result.awbCode ?? null,
      courierName: result.courierName ?? null,
      shippingStatus: "processing",
      shiprocketError: null,
      ...(result.awbCode && {
        trackingUrl: `https://shiprocket.co/tracking/${result.awbCode}`,
      }),
    });
  } catch (err) {
    console.error(`Auto Shiprocket creation failed for order ${order._id}:`, err);
    // Record the failure on the order itself so it's visible in admin
    // rather than only living in the server logs — makes stuck orders
    // (like the recurring billing_phone 422s) easy to find and fix.
    await Order.findByIdAndUpdate(order._id, {
      shippingStatus: "needs_attention",
      shiprocketError: err instanceof Error ? err.message : String(err),
    }).catch((updateErr) =>
      console.error(`Failed to record Shiprocket error on order ${order._id}:`, updateErr)
    );
  }
}

export async function cancelShiprocketOrder(shiprocketOrderId: number) {
  const token = await getToken();
  const res = await fetch(`${SHIPROCKET_API}/orders/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ids: [shiprocketOrderId] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Shiprocket cancel failed: ${JSON.stringify(data)}`);
  return data;
}


const SHIPROCKET_API = "https://apiv2.shiprocket.in/v1/external";

interface TokenCache {
  token: string;
  fetchedAt: number; // ms timestamp
}

// Module-level cache — survives across requests in the same server process
let tokenCache: TokenCache | null = null;
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000; // 9 days in ms

async function getToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && now - tokenCache.fetchedAt < TOKEN_TTL_MS) {
    return tokenCache.token;
  }

  const res = await fetch(`${SHIPROCKET_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shiprocket auth failed: ${err}`);
  }

  const data = await res.json();

  if (!data.token) {
    throw new Error("Shiprocket auth response missing token");
  }

 

  tokenCache = { token: data.token, fetchedAt: now };
  return data.token;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  weight: number;
  gstPercent?: number;   // ← add
  hsn?: string;           // ← add
  length?: number;   // ← new
  breadth?: number;  // ← new
  height?: number;   // ← new
}

export interface ShiprocketAddress {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface CreateShiprocketOrderParams {
  orderId: string;          // your internal MongoDB order _id (used as order_id)
  orderDate: string;        // ISO date string e.g. "2026-06-29"
  items: ShiprocketOrderItem[];
  shipping: ShiprocketAddress;
  billing: ShiprocketAddress;
  paymentMethod: "COD" | "Prepaid";
  subTotal: number;
  totalDiscount?: number;
  shippingCharges?: number;
  // Our internal COD handling fee. Shiprocket has no dedicated field for
  // this, so it's folded into shipping_charges below — Shiprocket derives
  // the collectable COD amount from sub_total + shipping_charges, and this
  // must match what was actually charged to the customer at checkout.
  codCharge?: number;
}

export interface ShiprocketOrderResult {
  shiprocketOrderId: number;
  shiprocketShipmentId: number;
  status: string;
  awbCode?: string;
  courierName?: string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function createShiprocketOrder(
  params: CreateShiprocketOrderParams
): Promise<ShiprocketOrderResult> {
  const token = await getToken();

  const totalWeight = params.items.reduce(
    (sum, item) => sum + item.weight * item.units,
    0
  );

  const box = computeBoxDimensions(params.items);

  // ── DEBUG: the final box dimensions actually sent to Shiprocket ────────────
  console.log("[Shiprocket:createOrder] Computed box:", box);
  console.log("[Shiprocket:createOrder] Total weight:", totalWeight);

  const payload = {
    order_id: params.orderId,
    order_date: params.orderDate,
    pickup_location: "Nezal Mumbai Office",

    channel_id: "",
    comment: "",

    billing_customer_name: params.billing.name,
    billing_last_name: "",
    billing_address: params.billing.address,
    billing_address_2: "",
    billing_city: params.billing.city,
    billing_pincode: params.billing.pincode,
    billing_state: params.billing.state,
    billing_country: params.billing.country,
    billing_email: params.billing.email,
    billing_phone: params.billing.phone,

    shipping_is_billing: false,
    shipping_customer_name: params.shipping.name,
    shipping_last_name: "",
    shipping_address: params.shipping.address,
    shipping_address_2: "",
    shipping_city: params.shipping.city,
    shipping_pincode: params.shipping.pincode,
    shipping_state: params.shipping.state,
    shipping_country: params.shipping.country,
    shipping_email: params.shipping.email,
    shipping_phone: params.shipping.phone,

    length: box.length,
    breadth: box.breadth,
    height: box.height,
    weight: parseFloat(totalWeight.toFixed(2)),

    order_items: params.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      units: item.units,
      selling_price: item.selling_price,
      discount: 0,
      tax: item.gstPercent ?? 0,
      hsn: item.hsn ?? "",
    })),

    payment_method: params.paymentMethod,
    // COD handling fee folded in here (see codCharge on the params type) so
    // the COD amount Shiprocket prints on the label / collects on delivery
    // matches the customer's actual order total, not just goods + shipping.
    shipping_charges: (params.shippingCharges ?? 0) + (params.codCharge ?? 0),
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: params.totalDiscount ?? 0,
    sub_total: params.subTotal,
  };

  // ── DEBUG: the full payload right before it's sent to Shiprocket ───────────
  console.log("[Shiprocket:createOrder] Full payload:", JSON.stringify(payload, null, 2));

  const res = await fetch(`${SHIPROCKET_API}/orders/create/adhoc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  // ── DEBUG: Shiprocket's confirmation response ───────────────────────────────
  console.log("[Shiprocket:createOrder] Response:", JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error(
      `Shiprocket order creation failed: ${JSON.stringify(data)}`
    );
  }

  return {
    shiprocketOrderId: data.order_id,
    shiprocketShipmentId: data.shipment_id,
    status: data.status,
    awbCode: data.awb_code ?? undefined,
    courierName: data.courier_name ?? undefined,
  };
}



export interface ShiprocketRateOption {
  courierId: number;
  courierName: string;
  rate: number;
  freightCharge: number;
  codCharge: number;
  otherCharges: number;
  etd: string;
  codAvailable: boolean;
}

export async function getShippingRate({
  deliveryPincode,
  weight,
  cod = false,
  length,
  breadth,
  height,
}: {
  deliveryPincode: string;
  weight: number;
  cod?: boolean;
  length?: number;
  breadth?: number;
  height?: number;
}): Promise<{ cheapest: ShiprocketRateOption | null; options: ShiprocketRateOption[] }> {
  const token = await getToken();
  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE;

  if (!pickupPincode) {
    throw new Error("SHIPROCKET_PICKUP_PINCODE is not set in env");
  }

  const params = new URLSearchParams({
    pickup_postcode: pickupPincode,
    delivery_postcode: deliveryPincode,
    weight: weight.toFixed(2),
    cod: cod ? "1" : "0",
  });

  if (length) params.set("length", length.toFixed(1));
  if (breadth) params.set("breadth", breadth.toFixed(1));
  if (height) params.set("height", height.toFixed(1));

  // ── DEBUG ──────────────────────────────────────────────────────────────
  console.log("[Shiprocket:getShippingRate] Request params:", params.toString());

  const res = await fetch(`${SHIPROCKET_API}/courier/serviceability/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();

  // ── DEBUG: raw response before any of our own math touches it ──────────
  console.log("[Shiprocket:getShippingRate] Raw response:", JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error(`Shiprocket serviceability failed: ${JSON.stringify(data)}`);
  }

  const companies = data?.data?.available_courier_companies ?? [];

  if (!Array.isArray(companies) || companies.length === 0) {
    console.log("[Shiprocket:getShippingRate] No couriers returned for this pincode/weight combo.");
    return { cheapest: null, options: [] };
  }

  const options: ShiprocketRateOption[] = companies.map((c: any) => ({
    courierId: c.courier_company_id,
    courierName: c.courier_name,
    rate: c.rate,
    freightCharge: c.freight_charge ?? c.rate,
    codCharge: c.cod_charges ?? 0,
    otherCharges: c.other_charges ?? 0,
    etd: c.etd,
    codAvailable: c.cod === 1,
  }));

  options.sort((a, b) => a.rate - b.rate);

  // ── DEBUG ──────────────────────────────────────────────────────────────
  console.log("[Shiprocket:getShippingRate] Selected cheapest:", JSON.stringify(options[0], null, 2));

  return { cheapest: options[0], options };
}


/**
 * Fetches the current order status directly from Shiprocket.
 * Response shape isn't fully documented publicly — I'm reading the most
 * commonly reported fields (data.status / data.order_status). Log the raw
 * response once against a real order and adjust if the field names differ.
 */
export async function getShiprocketOrderStatus(shiprocketOrderId: number) {
  const token = await getToken();
  const res = await fetch(`${SHIPROCKET_API}/orders/show/${shiprocketOrderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Shiprocket order status fetch failed: ${JSON.stringify(data)}`);
  }
  const record = data?.data ?? data;
  return {
    status: (record?.status ?? record?.order_status ?? "").toString().toUpperCase(),
    awb: record?.shipments?.[0]?.awb ?? record?.awb_code ?? null,
    courierName: record?.shipments?.[0]?.courier ?? record?.courier_name ?? null,
    raw: data,
  };
}


// Combines multiple products into one approximate shipping box.
// Heuristic: take the largest footprint (L×B) among items, and stack
// heights (× quantity) as if everything were placed in a single box.
// Not perfect bin-packing, but far closer to reality than one fixed size.
function computeBoxDimensions(items: ShiprocketOrderItem[]) {
  if (items.length === 0) {
    return { length: 10, breadth: 10, height: 10 };
  }
  const length = Math.max(...items.map((i) => i.length ?? 10));
  const breadth = Math.max(...items.map((i) => i.breadth ?? 10));
  const height = items.reduce(
    (sum, i) => sum + (i.height ?? 10) * i.units,
    0
  );
  return { length, breadth, height };
}
