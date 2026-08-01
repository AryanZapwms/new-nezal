import crypto from "crypto";

export function generateNumericOtp(length = 6) {
  const digits = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * digits.length);
    result += digits[idx];
  }
  return result;
}

export function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function isExpired(date: Date) {
  return new Date() > date;
}
