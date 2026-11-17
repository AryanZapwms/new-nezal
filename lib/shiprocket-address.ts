// lib/shiprocket-address.ts
//
// Address and phone rules for Shiprocket's create-order API (lib/shiprocket.ts).
// No database or server-only imports.

// Shiprocket accepts at most this many characters of address: one field over
// it gets a 422 ("may not be greater than 190 characters"), and address +
// address_2 together over it a 400 ("Address 1 and Address 2 combined cannot
// be greater 190 than characters"). Their API docs state no address limit at
// all. So the whole address goes in *_address and *_address_2 stays empty.
export const SHIPROCKET_ADDRESS_MAX = 190;

// Strips spaces/dashes/parens/country-code prefixes and returns a clean
// 10-digit Indian mobile number, or "" if it can't be normalized to one.
// lib/shiprocket.ts applies it again before every shipment as a defensive
// second layer (app/api/orders/route.ts has its own copy) — callers such as
// admin retries and scripts shouldn't have to sanitize the phone themselves.
export function sanitizePhone(raw: string | undefined | null): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? digits : "";
}

// Whitespace and runs of commas collapsed (",,,," or ", , ," → ","), and
// leading/trailing commas, spaces and hyphens dropped: empty address parts add
// length, not information.
export function normalizeShiprocketAddress(raw: string | undefined | null): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .replace(/,(\s*,)+/g, ",")
    .replace(/^[\s,-]+|[\s,-]+$/g, "");
}

export interface AddressLocation {
  pincode?: string | null;
  state?: string | null;
  country?: string | null;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The pincode, state and country are sent in their own fields, so taking them
// out of the address string loses nothing. Conservative on purpose, so a real
// part of the address never goes:
// - the pincode only as a whole number, not inside "B-400001" or "Mumbai-400001"
// - the state and country only as a whole comma-separated part
//   ("…, Maharashtra, India"), in any case. Matching single words would turn
//   "New Delhi" into "New" for state Delhi, or "India Gate" into "Gate".
// The city is left alone for the same reason ("Navi Mumbai" in city Mumbai).
function removeRepeatedLocation(address: string, location: AddressLocation): string {
  let out = address;

  const pincode = String(location.pincode ?? "").replace(/\D/g, "");
  if (/^\d{6}$/.test(pincode)) {
    out = normalizeShiprocketAddress(out.replace(new RegExp(`(?<![\\w-])${pincode}(?![\\w-])`, "g"), ""));
  }

  const names = [location.state, location.country, "India"]
    .map((name) => String(name ?? "").trim())
    .filter((name) => name.length > 0);
  for (const name of names) {
    out = out.replace(new RegExp(`(^|,)[\\s.-]*${escapeRegExp(name)}[\\s.-]*(?=,|$)`, "gi"), "$1");
  }

  return normalizeShiprocketAddress(out);
}

export interface FittedShiprocketAddress {
  // What goes in *_address — at most SHIPROCKET_ADDRESS_MAX. *_address_2 stays "".
  address: string;
  // Length of the normalized address before any of the steps below
  originalLength: number;
  // The repeated pincode/state/country were taken out
  removedRepeats: boolean;
  // It was still too long and had to be cut, so part of it isn't sent
  shortened: boolean;
}

// An address that fits is sent as is (normalized). Otherwise the repeated
// pincode/state/country come out first, and only if it's still too long is it
// cut at the last space before the limit (a hard cut only if there's no space
// in its second half). The order itself always keeps the full address.
export function fitShiprocketAddress(
  raw: string | undefined | null,
  location: AddressLocation,
  max = SHIPROCKET_ADDRESS_MAX
): FittedShiprocketAddress {
  const original = normalizeShiprocketAddress(raw);
  if (original.length <= max) {
    return { address: original, originalLength: original.length, removedRepeats: false, shortened: false };
  }

  const withoutRepeats = removeRepeatedLocation(original, location);
  const removedRepeats = withoutRepeats !== original;
  if (withoutRepeats.length <= max) {
    return { address: withoutRepeats, originalLength: original.length, removedRepeats, shortened: false };
  }

  const space = withoutRepeats.lastIndexOf(" ", max);
  const cut = space >= max / 2 ? space : max;
  return {
    address: normalizeShiprocketAddress(withoutRepeats.slice(0, cut)),
    originalLength: original.length,
    removedRepeats,
    shortened: true,
  };
}

// Review note for an order whose address had to be cut to fit (set by
// createShiprocketOrderForOrder in lib/shiprocket.ts).
export function shortenedAddressNote(fitted: FittedShiprocketAddress, max = SHIPROCKET_ADDRESS_MAX): string {
  return (
    `Address shortened for the Shiprocket shipment: it is ${fitted.originalLength} characters and Shiprocket allows ${max}` +
    `${fitted.removedRepeats ? " (still over after removing the repeated PIN code/state/country)" : ""}. ` +
    `Check the shipment label before pickup. Sent: "${fitted.address}". The full address is unchanged on this order.`
  );
}
