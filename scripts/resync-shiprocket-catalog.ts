/**
 * ============================================================
 *  RESYNC: re-send every product to Shiprocket's catalog
 * ------------------------------------------------------------
 *  One-off, after the fix that prices Shiprocket's catalog with lib/pricing.ts
 *  (a size's own sale price, e.g. ₹180 for a 3+1 pack, instead of the
 *  product's sale % on the size's full price). Shiprocket charges what its
 *  catalog copy says, and that copy only updates when it polls
 *  GET /api/shiprocket/products or when a product is notified — so this
 *  notifies every product the feed lists (active, with a numericId), priced
 *  exactly like the feed (lib/shiprocket-webhooks.ts notifyProductWebhook).
 *
 *  Reads the database only: no writes, no index builds (autoIndex and
 *  autoCreate are off). Does not read .env files — set the variables yourself.
 *
 *  Usage (PowerShell):
 *    $env:MONGODB_URI = "<connection string>"
 *    npx tsx@4.19.2 scripts/resync-shiprocket-catalog.ts                  # dry run (default): prints prices
 *    npx tsx@4.19.2 scripts/resync-shiprocket-catalog.ts --full           # dry run: prints each full payload
 *    npx tsx@4.19.2 scripts/resync-shiprocket-catalog.ts --ids=78,79      # only these numericIds
 *
 *    # Sending also needs the catalog webhook credentials, and the database
 *    # name typed back so it can't run against the wrong database by mistake:
 *    $env:SHIPROCKET_CATALOG_WEBHOOK_API_KEY = "<key>"
 *    $env:SHIPROCKET_CATALOG_WEBHOOK_SECRET = "<secret>"
 *    npx tsx@4.19.2 scripts/resync-shiprocket-catalog.ts --send --confirm-db=<database name>
 *
 *  SHIPROCKET_WEBHOOK_BASE_URL (optional) points it at a staging endpoint.
 *  Exits 1 if any product wasn't accepted; those numericIds are listed, and
 *  re-running with --ids=<them> sends just those again.
 * ============================================================
 */

import mongoose from "mongoose";
import { Product } from "@/lib/models/product";
import "@/lib/models/company";
import "@/lib/models/category";
import { getActiveFlashSaleMap } from "@/lib/flashSale";
import { mapProductToShiprocket } from "@/lib/shiprocket-mapper";
import { notifyProductWebhook, hasCatalogWebhookCredentials } from "@/lib/shiprocket-webhooks";

// Pause between notifications, to stay well clear of any rate limit
const SEND_DELAY_MS = 250;

function parseArgs(argv: string[]) {
  const value = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const known = ["--send", "--full"];
  const unknown = argv.filter((a) => !known.includes(a) && !/^--(ids|confirm-db)=/.test(a));
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(" ")}`);

  const ids = value("ids")
    ?.split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (value("ids") !== undefined && !ids?.length) throw new Error("--ids needs a comma-separated list of numericIds");

  return { send: argv.includes("--send"), full: argv.includes("--full"), ids, confirmDb: value("confirm-db") };
}

// What the feed sent before this fix: the product's sale % on the size's full
// price, ignoring a size's own sale price and flash sales. Shown in the dry
// run only, so it says which variants change.
function previousFeedPrice(product: any, fullPrice: number): number {
  const hasActiveSale = product.saleSource && product.saleSource !== "none" && product.salePercentage;
  return hasActiveSale ? Math.round(fullPrice - (fullPrice * product.salePercentage) / 100) : fullPrice;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI first (this script doesn't read .env files).");
  if (args.send && !hasCatalogWebhookCredentials()) {
    throw new Error(
      "--send needs SHIPROCKET_CATALOG_WEBHOOK_API_KEY and SHIPROCKET_CATALOG_WEBHOOK_SECRET set. Nothing was sent."
    );
  }

  mongoose.set("autoIndex", false);
  mongoose.set("autoCreate", false);
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10_000 });

  const dbName = mongoose.connection.name;
  console.log(`Database: ${dbName} on ${mongoose.connection.host}`);
  console.log(`Mode: ${args.send ? "SEND to Shiprocket" : "dry run — nothing is sent"}`);
  if (args.send) {
    console.log(`Webhook endpoint: ${process.env.SHIPROCKET_WEBHOOK_BASE_URL || "https://checkout-api.shiprocket.com"}`);
    if (args.confirmDb !== dbName) {
      throw new Error(`--send needs --confirm-db=${dbName} (the database name above). Nothing was sent.`);
    }
  }

  // The same products GET /api/shiprocket/products lists
  const query: Record<string, unknown> = { isActive: true, numericId: { $exists: true } };
  if (args.ids) query.numericId = { $in: args.ids };
  const products: any[] = await Product.find(query)
    .populate("company", "name")
    .populate("category", "name")
    .sort({ numericId: 1 })
    .lean();
  const flashSaleMap = await getActiveFlashSaleMap();

  console.log(`Products: ${products.length}; active flash sales cover ${flashSaleMap.size} product(s)`);
  if (args.ids) {
    const missing = args.ids.filter((id) => !products.some((p) => p.numericId === id));
    if (missing.length) console.log(`Not found (or inactive): numericId ${missing.join(", ")}`);
  }
  console.log("");

  let variants = 0;
  let changed = 0;
  for (const product of products) {
    const payload = mapProductToShiprocket(product, flashSaleMap);
    console.log(`#${product.numericId} ${product.name}${flashSaleMap.has(String(product._id)) ? "  [flash sale]" : ""}`);
    const sizes: any[] = product.sizes ?? [];
    payload.variants.forEach((variant: any, index: number) => {
      variants++;
      const fullPrice = sizes.length ? sizes[index].price : product.price;
      const before = previousFeedPrice(product, fullPrice);
      const isChanged = String(before) !== variant.price;
      if (isChanged) changed++;
      console.log(
        `   ${variant.id}  ${String(variant.title).trim()}: price ${variant.price}` +
          `${variant.compare_at_price ? ` (compare-at ${variant.compare_at_price})` : ""}` +
          `${isChanged ? `   <- was ${before}` : ""}`
      );
    });
    if (args.full) console.log(JSON.stringify(payload, null, 2));
  }
  console.log(`\n${variants} variant(s); ${changed} priced differently from before this fix.`);

  if (!args.send) {
    console.log("Dry run — nothing was sent. Add --send --confirm-db=<database name> to send.");
    return;
  }

  const failed: number[] = [];
  for (const [i, product] of products.entries()) {
    const ok = await notifyProductWebhook(product, flashSaleMap);
    if (!ok) failed.push(product.numericId);
    if (i < products.length - 1) await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
  }

  console.log(`\nSent: ${products.length - failed.length} accepted, ${failed.length} not accepted.`);
  if (failed.length) {
    console.log(`Not accepted: numericId ${failed.join(",")} — re-run with --ids=${failed.join(",")} to retry them.`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
