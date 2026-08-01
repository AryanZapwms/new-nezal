// nezal-seed/check-payment-settings.js
//
// Checks for duplicate PaymentSettings documents in the database.
//
// Usage:
//   node nezal-seed/check-payment-settings.js

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local or export it before running.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const PaymentSettings = mongoose.connection.collection("paymentsettings");

  const all = await PaymentSettings.find({}).toArray();
  console.log(`Found ${all.length} PaymentSettings document(s)\n`);

  all.forEach((d, i) => {
    console.log(`[${i}] _id: ${d._id}`);
    console.log(`    enableCOD: ${d.enableCOD}, codFeeEnabled: ${d.codFeeEnabled}, codFeeValue: ${d.codFeeValue}`);
    console.log(`    updatedAt: ${d.updatedAt}`);
    console.log("");
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});