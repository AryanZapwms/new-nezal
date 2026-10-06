/**
 * ============================================================
 *  Preview the email templates (lib/email-templates.ts)
 * ------------------------------------------------------------
 *  Usage:
 *    node scripts/preview-emails.js                  # write previews, send nothing
 *    node scripts/preview-emails.js --send <name>    # also send that one sample
 *
 *  Previews go to <os temp dir>/nezal-email-preview/: an .html and a .txt
 *  file per template, plus index.html listing them with their subjects.
 *
 *  --send delivers the sample through lib/mailer.ts using the mail settings
 *  in .env.local / .env. The recipient is fixed to TEST_RECIPIENT below and
 *  cannot be changed from the command line, so a customer can never be
 *  mailed from here.
 * ============================================================
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require("typescript");

const TEST_RECIPIENT = "nezalsoaps@gmail.com";
const OUT_DIR = path.join(os.tmpdir(), "nezal-email-preview");

// The templates are TypeScript. Transpile them on require so this script
// needs no build step and no extra dependency.
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const templates = require("../lib/email-templates.ts");

// ── Sample data (invented; no real customer) ───────────────────────────────
const items = [
  { name: "Kumkumadi Face Oil", quantity: 1, price: 549, selectedSize: { size: "Small", unit: "ml", quantity: 15 } },
  { name: "Neem & Tulsi Soap", quantity: 2, price: 120 },
];

const address = {
  name: "Asha Sharma",
  phone: "9000000000",
  street: "12 Example Street, Shivaji Nagar",
  city: "Pune",
  state: "Maharashtra",
  zipCode: "411005",
  country: "India",
};

const order = {
  customerName: "Asha Sharma",
  orderId: "ORD-1759740000000",
  items,
  orderDate: "6 October 2026",
};

const codSummary = templates.orderSummaryFields({
  shippingAmount: 60,
  codCharge: 40,
  discountAmount: 50,
  couponCode: "WELCOME50",
  paymentMethod: "cod",
  shippingAddress: address,
});

const prepaidSummary = templates.orderSummaryFields({
  shippingAmount: 0,
  codCharge: 0,
  discountAmount: 0,
  paymentMethod: "razorpay",
  shippingAddress: address,
});

const samples = {
  "order-confirmation-cod": templates.getOrderConfirmationEmail({ ...order, total: 839, ...codSummary }),
  "order-confirmation-prepaid": templates.getOrderConfirmationEmail({
    ...order,
    total: 789,
    paymentStatus: "completed",
    ...prepaidSummary,
  }),
  "order-status-shipped": templates.getOrderStatusUpdateEmail({
    ...order,
    orderStatus: "shipped",
    paymentStatus: "completed",
    totalAmount: 789,
    ...prepaidSummary,
  }),
  "order-cancelled": templates.getOrderCancelledEmail({
    customerName: order.customerName,
    orderNumber: order.orderId,
    totalAmount: 789,
    reason: "Requested by customer",
    refundInitiated: true,
  }),
  "payment-failed": templates.getPaymentFailedEmail({
    customerName: order.customerName,
    orderId: order.orderId,
    totalAmount: 789,
    reason: "Transaction declined by the bank",
  }),
  "abandoned-payment": templates.getAbandonedPaymentEmail({
    customerName: order.customerName,
    orderId: order.orderId,
    totalAmount: 789,
  }),
  welcome: templates.getWelcomeEmail(order.customerName),
  "verification-code": templates.getOtpEmail(order.customerName, "482913"),
};

// The admin notification is HTML-only; give each sample the subject and the
// derived text part it is actually sent with.
const adminSample = (subject, fields) => {
  const html = templates.getAdminOrderNotificationEmail({
    customerName: order.customerName,
    customerEmail: "asha@example.com",
    customerPhone: address.phone,
    orderId: order.orderId,
    items,
    shippingAddress: address,
    orderDate: order.orderDate,
    ...fields,
  });
  return { subject, html, text: templates.htmlToText(html), category: "transactional" };
};

// COD order with shipping, a COD charge and a coupon discount: 789 - 50 + 60 + 40 = 839.
samples["admin-new-order-cod"] = adminSample(`🚨 NEW ORDER (Shiprocket) - ${order.orderId}`, {
  ...codSummary,
  totalAmount: 839,
  paymentStatus: "pending",
  paymentMethod: "shiprocket_checkout (COD)",
});

// Paid online with free shipping.
samples["admin-new-order-prepaid"] = adminSample(`🚨 NEW ORDER - ${order.orderId}`, {
  ...prepaidSummary,
  totalAmount: 789,
  paymentStatus: "completed",
  paymentMethod: "razorpay",
});

// A total the order's own charges don't account for: the ₹100 difference is
// shown as "Other charges". Building this sample logs the template's warning
// on purpose.
samples["admin-new-order-unexplained-total"] = adminSample(`🚨 NEW ORDER (Shiprocket) - ${order.orderId}`, {
  ...prepaidSummary,
  items: [{ name: "Neem & Tulsi Soap", quantity: 1, price: 83 }],
  totalAmount: 183,
  paymentStatus: "pending",
  paymentMethod: "shiprocket_checkout (COD)",
});

// ── Write the previews ─────────────────────────────────────────────────────
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

fs.mkdirSync(OUT_DIR, { recursive: true });

const rows = Object.entries(samples).map(([name, email]) => {
  fs.writeFileSync(path.join(OUT_DIR, `${name}.html`), email.html);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}\n`);
  console.log(`${name.padEnd(28)} ${email.subject}`);
  return (
    `<tr><td>${name}</td><td>${escapeHtml(email.subject)}</td><td>${email.category}</td>` +
    `<td><a href="${name}.html">html</a> | <a href="${name}.txt">text</a></td></tr>`
  );
});

fs.writeFileSync(
  path.join(OUT_DIR, "index.html"),
  `<!DOCTYPE html><meta charset="UTF-8"><title>Nezal email previews</title>` +
    `<body style="font-family:Arial,sans-serif;padding:24px;"><h1>Nezal email previews</h1>` +
    `<table cellpadding="8" border="1" style="border-collapse:collapse;">` +
    `<tr><th align="left">Template</th><th align="left">Subject</th><th align="left">Category</th><th align="left">Preview</th></tr>` +
    `${rows.join("")}</table></body>`,
);

console.log(`\nWrote ${rows.length} previews to ${OUT_DIR}`);
console.log(`Open ${path.join(OUT_DIR, "index.html")}`);

// ── Optional test send ─────────────────────────────────────────────────────
const sendIndex = process.argv.indexOf("--send");
if (sendIndex !== -1) {
  const name = process.argv[sendIndex + 1];
  const email = samples[name];
  if (!email) {
    console.error(`\n--send needs one of: ${Object.keys(samples).join(", ")}`);
    process.exit(1);
  }

  require("dotenv").config({ path: [".env.local", ".env"], quiet: true });
  const { deliverMail } = require("../lib/mailer.ts");

  console.log(`\nSending "${name}" to ${TEST_RECIPIENT} ...`);
  deliverMail({ to: TEST_RECIPIENT, ...email }).catch(() => {
    // deliverMail has already logged the reason.
    process.exitCode = 1;
  });
}
