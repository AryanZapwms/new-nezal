import { NextRequest, NextResponse } from "next/server";
import { getShippingRate } from "@/lib/shiprocket";
import { Product } from "@/lib/models/product";
import { connectDB } from "@/lib/db";

const SMART_ORDER_FEE = 0;
const RATE_DRIFT_BUFFER = 0;
const SHIPPING_BUFFER = SMART_ORDER_FEE + RATE_DRIFT_BUFFER;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pincode, items, cod } = body;

    console.log("[shipping-rate] Incoming request body:", JSON.stringify(body, null, 2));

    if (!pincode || !/^\d{6}$/.test(String(pincode))) {
      return NextResponse.json({ error: "Valid 6-digit pincode required" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array required" }, { status: 400 });
    }

    await connectDB();

    const productIds = items.map((i: any) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } })
      .select("weight length breadth height sizes"); // ← now also fetch sizes

    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

    // Resolve per-item weight + dimensions: prefer the selected size's own
    // values, fall back to the base product's if the size has none set.
    const resolveDims = (item: any) => {
      const product = productMap.get(item.productId);
      if (!product) return { weight: 0.3, length: 10, breadth: 10, height: 10 };

      let matchedSize: any = null;
      if (item.selectedSize?.size) {
        matchedSize = product.sizes?.find((s: any) => s.size === item.selectedSize.size);
      }

      return {
        weight: matchedSize?.weight ?? product.weight ?? 0.3,
        length: matchedSize?.length ?? product.length ?? 10,
        breadth: matchedSize?.breadth ?? product.breadth ?? 10,
        height: matchedSize?.height ?? product.height ?? 10,
      };
    };

    const totalWeight = items.reduce((sum: number, i: any) => {
      const dims = resolveDims(i);
      return sum + dims.weight * (i.quantity ?? 1);
    }, 0);

    const boxLength = Math.max(...items.map((i: any) => resolveDims(i).length));
    const boxBreadth = Math.max(...items.map((i: any) => resolveDims(i).breadth));
    const boxHeight = items.reduce((sum: number, i: any) => {
      const dims = resolveDims(i);
      return sum + dims.height * (i.quantity ?? 1);
    }, 0);

    console.log("[shipping-rate] Computed box:", { totalWeight, boxLength, boxBreadth, boxHeight, cod: !!cod });

    const { cheapest, options } = await getShippingRate({
      deliveryPincode: String(pincode),
      weight: Math.max(totalWeight, 0.1),
      cod: !!cod,
      length: boxLength,
      breadth: boxBreadth,
      height: boxHeight,
    });

    if (!cheapest) {
      return NextResponse.json({ serviceable: false, error: "Not serviceable to this pincode" });
    }

    console.log("[shipping-rate] Final rate breakdown:", {
      baseCourierRate: cheapest.rate,
      buffer: SHIPPING_BUFFER,
      finalRate: cheapest.rate + SHIPPING_BUFFER,
      codCharge: cheapest.codCharge,
      freightCharge: cheapest.freightCharge,
      courierName: cheapest.courierName,
    });

    return NextResponse.json({
      serviceable: true,
      rate: cheapest.rate + SHIPPING_BUFFER,
      breakdown: {
        baseCourierRate: cheapest.rate,
        smartOrderFee: SMART_ORDER_FEE,
        rateDriftBuffer: RATE_DRIFT_BUFFER,
        courierNameQuoted: cheapest.courierName,
      },
      freightCharge: cheapest.freightCharge,
      codCharge: cheapest.codCharge,
      courierName: cheapest.courierName,
      etd: cheapest.etd,
      weight: totalWeight,
      options,
    });

  } catch (err: any) {
    console.error("Shipping rate error:", err.message);
    return NextResponse.json({ error: err.message ?? "Failed to fetch shipping rate" }, { status: 500 });
  }
}