// lib/whatsapp.ts
// Thin wrapper around the ScaleChat WhatsApp Business API.
// Docs: https://scalechat.in/client/api-docs

const SCALECHAT_BASE_URL = "https://scalechat.in/api/v1";
const SCALECHAT_API_KEY = process.env.SCALECHAT_API_KEY!;

if (!SCALECHAT_API_KEY) {
  console.warn("[whatsapp] SCALECHAT_API_KEY is not set — WhatsApp sends will fail.");
}

type ScaleChatResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; message: string };

async function scalechatRequest<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${SCALECHAT_BASE_URL}${path}`, {
    ...init,
    headers: {
      "X-API-Key": SCALECHAT_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const json = (await res.json()) as ScaleChatResponse<T>;

  if (!res.ok || !json.success) {
    const message = !json.success ? json.message : `HTTP ${res.status}`;
    throw new Error(`[whatsapp] ScaleChat API error (${path}): ${message}`);
  }

  return json.data;
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