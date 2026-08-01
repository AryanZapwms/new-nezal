// lib/ccavenue.ts
/**
 * CCAvenue Non-Seamless (Standard Checkout) integration helper.
 * Uses AES-128-CBC encryption as required by CCAvenue's Working Key.
 *
 * Flow:
 *   1. Build order params string (key1=value1&key2=value2...)
 *   2. Encrypt with encrypt() using WORKING_KEY
 *   3. POST encRequest + access_code to CCAvenue's transaction URL
 *      (this redirects the browser to CCAvenue's hosted payment page)
 *   4. CCAvenue redirects back to your redirect_url with encResp
 *   5. Decrypt encResp with decrypt() to read payment status
 */

import crypto from "crypto";

const WORKING_KEY = process.env.CCAVENUE_WORKING_KEY!; // 32-char key from CCAvenue
const ACCESS_CODE = process.env.CCAVENUE_ACCESS_CODE!;
const MERCHANT_ID = process.env.CCAVENUE_MERCHANT_ID!;

// CCAvenue uses MD5 hash of working key as the actual AES key, first 16 bytes as IV
function getKeyAndIV() {
  const md5Key = crypto.createHash("md5").update(WORKING_KEY).digest();
  const iv = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  ]);
  return { key: md5Key, iv };
}

export function encrypt(plainText: string): string {
  const { key, iv } = getKeyAndIV();
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function decrypt(encText: string): string {
  const { key, iv } = getKeyAndIV();
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  let decrypted = decipher.update(encText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export interface CCAvenueOrderParams {
  orderId: string; // your internal order id
  amount: number;
  redirectUrl: string; // where CCAvenue sends the success response
  cancelUrl: string; // where CCAvenue sends if user cancels
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
}

/**
 * Builds the encrypted request string + access code needed to POST to
 * CCAvenue's transaction endpoint.
 */
export function buildCCAvenueRequest(params: CCAvenueOrderParams) {
  const data: Record<string, string> = {
    merchant_id: MERCHANT_ID,
    order_id: params.orderId,
    currency: "INR",
    amount: params.amount.toFixed(2),
    redirect_url: params.redirectUrl,
    cancel_url: params.cancelUrl,
    language: "EN",
    billing_name: params.billingName,
    billing_address: params.billingAddress,
    billing_city: params.billingCity,
    billing_state: params.billingState,
    billing_zip: params.billingZip,
    billing_country: params.billingCountry,
    billing_tel: params.billingPhone,
    billing_email: params.billingEmail,
  };

  const queryString = Object.entries(data)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  const encRequest = encrypt(queryString);

  return { encRequest, accessCode: ACCESS_CODE };
}

/**
 * Parses the decrypted response string from CCAvenue into a key-value object.
 * Response format: order_id=123&order_status=Success&tracking_id=...&...
 */
export function parseCCAvenueResponse(decryptedText: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pairs = decryptedText.split("&");
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      result[key] = decodeURIComponent(value ?? "");
    }
  }
  return result;
}




// ── Refund API (separate from checkout flow) ──────────────────────────
// Requires CCAvenue to have whitelisted your server's IP for API access.
// Confirm exact response field names against a real test refund before
// relying on this in production — see rawResponse logging below.

const CCAVENUE_API_URL = "https://api.ccavenue.com/apis/servlet/DoWebTrans";

export interface CCAvenueRefundParams {
  referenceNo: string;   // CCAvenue's tracking_id from the original successful transaction
  refundAmount: number;
  refundRefNo: string;   // your own unique id for this refund attempt, e.g. `${orderId}-${Date.now()}`
}

export interface CCAvenueRefundResult {
  success: boolean;
  errorDesc?: string;
  raw: any;
}

export async function refundCCAvenueOrder(params: CCAvenueRefundParams): Promise<CCAvenueRefundResult> {
  const payload = JSON.stringify({
    reference_no: params.referenceNo,
    refund_amount: params.refundAmount.toFixed(2),
    refund_ref_no: params.refundRefNo,
  });

  const encRequest = encrypt(payload);

  const body = new URLSearchParams({
    request_type: "JSON",
    access_code: ACCESS_CODE,
    command: "refundOrder",
    response_type: "JSON",
    version: "1.2",
    enc_request: encRequest,
  });

  const res = await fetch(CCAVENUE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();

  // CCAvenue replies as a query string: enc_response=<hex>
  const parsedReply = new URLSearchParams(text);
  const encResponse = parsedReply.get("enc_response");

  if (!encResponse) {
    return { success: false, errorDesc: "No enc_response from CCAvenue", raw: { text } };
  }

  let json: any;
  try {
    const decrypted = decrypt(encResponse);
    json = JSON.parse(decrypted);
  } catch (err: any) {
    return { success: false, errorDesc: `Failed to parse refund response: ${err.message}`, raw: { text } };
  }

  const result = json.Refund_Order_Result ?? json;
  // status "0" = success is the CCAvenue convention seen elsewhere in their API (e.g. Confirm/Cancel).
  // Log `raw` on your first real test to confirm this holds for refundOrder too.
  const statusVal = result?.status ?? result?.Status;
  const success = statusVal === "0" || statusVal === 0;

  return {
    success,
    errorDesc: result?.reason ?? result?.error_desc ?? (success ? undefined : "Unknown failure"),
    raw: json,
  };
}