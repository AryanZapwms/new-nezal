import { deliverMail } from "@/lib/mailer";
import { getOtpEmail, getWelcomeEmail } from "@/lib/email-templates";

// Unlike sendEmail() in lib/email.tsx, these reject when the mail can't be
// sent: the auth routes rely on that to return an error instead of telling
// the user a code is on its way.
export async function sendOtpEmail(to: string, name: string, otp: string) {
  return deliverMail({ to, ...getOtpEmail(name, otp) });
}

export async function sendWelcomeEmail(to: string, name: string) {
  return deliverMail({ to, ...getWelcomeEmail(name) });
}
