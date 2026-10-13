// lib/whatsapp.ts
// Thin wrapper around the ScaleChat WhatsApp Business API.
// Docs: https://scalechat.in/client/api-docs

const SCALECHAT_BASE_URL = "https://scalechat.in/api/v1";
const SCALECHAT_API_KEY = process.env.SCALECHAT_API_KEY!;

if (!SCALECHAT_API_KEY) {
  console.warn("[whatsapp] SCALECHAT_API_KEY is not set — WhatsApp sends will fail.");
}

// A hung request would otherwise stall a whole cron run.
const SCALECHAT_TIMEOUT_MS = 15_000;

// Thrown for every failed ScaleChat call. `rejected` tells the caller
// whether a retry is safe: true when ScaleChat answered and refused the
// request (a 4xx, or a 2xx body with success: false), so nothing was sent;
// false when there was no clear answer (timeout, network error, 5xx) and
// the message may or may not have gone out.
export class ScaleChatError extends Error {
  constructor(
    message: string,
    public readonly rejected: boolean
  ) {
    super(message);
    this.name = "ScaleChatError";
  }
}

async function scalechatRequest<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SCALECHAT_BASE_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(SCALECHAT_TIMEOUT_MS),
      headers: {
        "X-API-Key": SCALECHAT_API_KEY,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new ScaleChatError(`[whatsapp] ScaleChat request failed (${path}): ${reason}`, false);
  }

  // A proxy error page isn't JSON — keep the HTTP status rather than dying
  // on the parse.
  const json = await res.json().catch(() => null);

  // A 2xx counts as accepted unless the body explicitly says otherwise:
  // treating an unfamiliar success shape as a failure would report (and
  // possibly retry) a message that was actually delivered.
  if (!res.ok || json?.success === false) {
    const message = json?.message || `HTTP ${res.status}`;
    const rejected = (res.status >= 400 && res.status < 500) || res.ok;
    throw new ScaleChatError(`[whatsapp] ScaleChat API error (${path}): ${message}`, rejected);
  }

  return (json?.data ?? json) as T;
}

// Test mode is the default: until the mode variable is exactly "live",
// WHATSAPP_TEST_PHONE is the only number anything may be sent to. testPhone
// is its last 10 digits, or "" when unset. Cart reminders and order
// messages each have their own switch, so one can go live without the other.
export function getWhatsAppTestMode(
  modeVariable: "WHATSAPP_REMINDER_MODE" | "WHATSAPP_ORDER_MODE" = "WHATSAPP_REMINDER_MODE"
): { testMode: boolean; testPhone: string } {
  return {
    testMode: process.env[modeVariable] !== "live",
    testPhone: (process.env.WHATSAPP_TEST_PHONE ?? "").replace(/\D/g, "").slice(-10),
  };
}

// Normalizes an Indian 10-digit number, or passes through an already
// country-coded number. Adjust if you sell outside India.
export function toWhatsAppPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits; // assume already has country code
}

interface ButtonVariable {
  index: number;
  sub_type: "url" | "quick_reply" | "copy_code";
  text: string;
}

interface SendTemplateParams {
  phone: string;
  templateName: string;
  language?: string; // default en_US
  variables?: string[]; // body {{1}}, {{2}}, ...
  headerVariables?: string[]; // header {{1}}
  buttonVariables?: ButtonVariable[];
}

export async function sendWhatsAppTemplate(params: SendTemplateParams) {
  return scalechatRequest("/messages/template", {
    method: "POST",
    body: JSON.stringify({
      phone: toWhatsAppPhone(params.phone),
      template_name: params.templateName,
      language: params.language ?? "en_US",
      variables: params.variables ?? [],
      ...(params.headerVariables ? { header_variables: params.headerVariables } : {}),
      ...(params.buttonVariables ? { button_variables: params.buttonVariables } : {}),
    }),
  });
}

// Only works inside a 24hr open session (customer messaged you recently).
// Mostly useful for support replies, not marketing — kept here for completeness.
export async function sendWhatsAppText(phone: string, message: string) {
  return scalechatRequest("/messages/send", {
    method: "POST",
    body: JSON.stringify({ phone: toWhatsAppPhone(phone), message }),
  });
}

export async function sendWhatsAppMedia(params: {
  phone: string;
  mediaType: "image" | "video" | "document" | "audio";
  url: string;
  caption?: string;
}) {
  return scalechatRequest("/messages/media", {
    method: "POST",
    body: JSON.stringify({
      phone: toWhatsAppPhone(params.phone),
      media_type: params.mediaType,
      url: params.url,
      caption: params.caption,
    }),
  });
}

export async function upsertWhatsAppContact(params: {
  name: string;
  phone: string;
  email?: string;
}) {
  return scalechatRequest<{ id: string }>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      phone: toWhatsAppPhone(params.phone),
      email: params.email,
    }),
  });
}

export async function tagWhatsAppContact(contactId: string, tags: string[]) {
  return scalechatRequest(`/contacts/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tags }),
  });
}

interface CreateBroadcastParams {
  name: string;
  templateName: string;
  phones: string[];
  language?: string;
}

export async function createWhatsAppBroadcast(params: CreateBroadcastParams) {
  return scalechatRequest<{ id: string }>("/broadcasts", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      template_name: params.templateName,
      language: params.language ?? "en",
      phones: params.phones.map(toWhatsAppPhone),
    }),
  });
}

export async function listApprovedTemplates() {
  return scalechatRequest<Array<{ name: string; status: string }>>(
    "/templates?status=approved"
  );
}