// nezal-seed/migrate-cloudinary-to-bunny.js
//
// Migrates Cloudinary-hosted images to Bunny.net Storage.
//
// Usage:
//   node nezal-seed/migrate-cloudinary-to-bunny.js --dry-run   (safe — no uploads, no DB writes)
//   node nezal-seed/migrate-cloudinary-to-bunny.js --live      (real run — uploads to Bunny + updates MongoDB)
//
// Requires in .env: MONGODB_URI, BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY,
// BUNNY_STORAGE_HOSTNAME, BUNNY_PULL_ZONE_URL
//
// Scope: only touches URLs that contain res.cloudinary.com, across the 7
// known DB fields (products.image, products.images[], blogs.image,
// homebanners.url, collections.heroImage, rituals.heroImage,
// concerns.heroImage, heroproducts.image) plus 11 hardcoded URLs in
// components/home-carousel.tsx, app/page.tsx, app/about-us/page.tsx and
// nezal-seed/seed-home-carousel.js. Hotlinked third-party URLs and the local
// /public paths in companies/categories are intentionally left untouched.

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { MongoClient, ObjectId } = require("mongodb");

const DRY_RUN = process.argv.includes("--dry-run");
const LIVE = process.argv.includes("--live");

if (DRY_RUN === LIVE) {
  console.error("Pass exactly one of --dry-run or --live");
  process.exit(1);
}

const {
  MONGODB_URI,
  BUNNY_STORAGE_ZONE,
  BUNNY_STORAGE_API_KEY,
  BUNNY_STORAGE_HOSTNAME,
  BUNNY_PULL_ZONE_URL,
} = process.env;

for (const [name, val] of Object.entries({
  MONGODB_URI,
  BUNNY_STORAGE_ZONE,
  BUNNY_STORAGE_API_KEY,
  BUNNY_STORAGE_HOSTNAME,
  BUNNY_PULL_ZONE_URL,
})) {
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

const PULL_ZONE = BUNNY_PULL_ZONE_URL.replace(/\/$/, "");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(__dirname, "migration-backups");
const LOG_DIR = path.join(__dirname, "migration-logs");
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

const logStream = fs.createWriteStream(path.join(LOG_DIR, `migration-${RUN_ID}.jsonl`), { flags: "a" });
function logLine(obj) {
  logStream.write(JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n");
}

// ── DB field -> Bunny path scheme ────────────────────────────────────────────
const FIELD_JOBS = [
  { collection: "products", field: "image", isArray: false, pathFn: (doc, fn) => `products/${doc._id}/${fn}` },
  { collection: "products", field: "images", isArray: true, pathFn: (doc, fn) => `products/${doc._id}/${fn}` },
  { collection: "blogs", field: "image", isArray: false, pathFn: (doc, fn) => `blogs/${doc._id}/${fn}` },
  { collection: "homebanners", field: "url", isArray: false, pathFn: (doc, fn) => `homebanners/${doc._id}/${fn}` },
  { collection: "collections", field: "heroImage", isArray: false, pathFn: (doc, fn) => `collections/${doc._id}/hero-${fn}` },
  { collection: "rituals", field: "heroImage", isArray: false, pathFn: (doc, fn) => `rituals/${doc._id}/hero-${fn}` },
  { collection: "concerns", field: "heroImage", isArray: false, pathFn: (doc, fn) => `concerns/${doc._id}/hero-${fn}` },
  { collection: "heroproducts", field: "image", isArray: false, pathFn: (doc, fn) => `heroproducts/${doc._id}/${fn}` },
];

// ── Hardcoded code-literal URLs found during the audit (not auto-edited) ────
const CODE_URLS = [
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1782990599/image9_a1avzr.png", files: ["components/home-carousel.tsx", "nezal-seed/seed-home-carousel.js"], targetPath: (fn) => `misc/carousel-fallback/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1782990599/image7_wfgoej.png", files: ["components/home-carousel.tsx", "nezal-seed/seed-home-carousel.js"], targetPath: (fn) => `misc/carousel-fallback/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1782990598/image8_cqm0fb.png", files: ["components/home-carousel.tsx", "nezal-seed/seed-home-carousel.js"], targetPath: (fn) => `misc/carousel-fallback/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1782990692/image10_escelc.png", files: ["components/home-carousel.tsx", "nezal-seed/seed-home-carousel.js"], targetPath: (fn) => `misc/carousel-fallback/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1779278431/nezal/uploads/rwzzisquhzzalhdngf9z.jpg", files: ["app/page.tsx"], targetPath: (fn) => `misc/promo-banners/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1783319156/hair_serum_i7llmw.jpg", files: ["app/page.tsx"], targetPath: (fn) => `misc/promo-banners/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1783319156/lotion_wrjr9l.jpg", files: ["app/page.tsx"], targetPath: (fn) => `misc/promo-banners/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1779278227/nezal/uploads/db5xjbpwpnmb6uf6yep6.jpg", files: ["app/page.tsx"], targetPath: (fn) => `misc/promo-banners/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1779341640/nezal/uploads/klcvgxsephlxhm6n4xib.jpg", files: ["app/page.tsx"], targetPath: (fn) => `misc/promo-banners/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1779341557/nezal/uploads/vz9jkgrr5tdccprgfl5a.jpg", files: ["app/page.tsx"], targetPath: (fn) => `misc/promo-banners/${fn}` },
  { url: "https://res.cloudinary.com/douyptcm1/image/upload/v1783582774/nezal-product-showcase_ebo16u.png", files: ["app/about-us/page.tsx"], targetPath: (fn) => `misc/about-us/${fn}` },
];

function extractFilename(cloudinaryUrl) {
  const clean = cloudinaryUrl.split("?")[0];
  const parts = clean.split("/");
  return decodeURIComponent(parts[parts.length - 1]);
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

async function downloadFile(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("downloaded 0 bytes");
  return buf;
}

async function uploadToBunny(targetPath, buffer) {
  const uploadUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${targetPath}`;
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { AccessKey: BUNNY_STORAGE_API_KEY, "Content-Type": "application/octet-stream" },
    body: buffer,
  });
  if (res.status !== 201) throw new Error(`bunny upload ${res.status} ${await res.text().catch(() => "")}`);
}

async function verifyBunnyUpload(targetPath, expectedSize) {
  const checkUrl = `https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${targetPath}`;
  const res = await fetch(checkUrl, { method: "GET", headers: { AccessKey: BUNNY_STORAGE_API_KEY } });
  if (!res.ok) throw new Error(`verify ${res.status}`);
  const len = Number(res.headers.get("content-length") || 0);
  if (len !== expectedSize) throw new Error(`size mismatch: expected ${expectedSize}, got ${len}`);
}

// ── Step 1: collect every DB job + take a backup of affected documents ──────
async function collectDbJobs(db) {
  const jobs = [];
  const backupDocsByColl = new Map(); // collection -> Map(_id -> doc)

  for (const spec of FIELD_JOBS) {
    const coll = db.collection(spec.collection);
    const docs = await coll.find({ [spec.field]: { $exists: true, $ne: null } }).toArray();

    for (const doc of docs) {
      const val = doc[spec.field];
      let touched = false;

      if (spec.isArray) {
        if (!Array.isArray(val)) continue;
        val.forEach((url, index) => {
          if (typeof url === "string" && url.includes("res.cloudinary.com")) {
            touched = true;
            const filename = extractFilename(url);
            jobs.push({
              collection: spec.collection,
              docId: doc._id,
              field: spec.field,
              isArray: true,
              index,
              oldUrl: url,
              targetPath: spec.pathFn(doc, filename),
            });
          }
        });
      } else if (typeof val === "string" && val.includes("res.cloudinary.com")) {
        touched = true;
        const filename = extractFilename(val);
        jobs.push({
          collection: spec.collection,
          docId: doc._id,
          field: spec.field,
          isArray: false,
          oldUrl: val,
          targetPath: spec.pathFn(doc, filename),
        });
      }

      if (touched) {
        if (!backupDocsByColl.has(spec.collection)) backupDocsByColl.set(spec.collection, new Map());
        backupDocsByColl.get(spec.collection).set(doc._id.toString(), doc);
      }
    }
  }

  return { jobs, backupDocsByColl };
}

function writeBackup(backupDocsByColl) {
  const out = {};
  let total = 0;
  for (const [coll, docsMap] of backupDocsByColl.entries()) {
    out[coll] = Array.from(docsMap.values());
    total += out[coll].length;
  }
  const file = path.join(BACKUP_DIR, `cloudinary-backup-${RUN_ID}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Backup written: ${file} (${total} documents across ${backupDocsByColl.size} collections)`);
  return file;
}

// ── Step 2: process each unique asset (download from Cloudinary, upload to Bunny) ──
async function processAssets(uniqueAssets) {
  const items = Array.from(uniqueAssets.entries());
  let done = 0;

  await runWithConcurrency(items, 5, async ([oldUrl, asset]) => {
    if (DRY_RUN) {
      asset.status = "dry-run";
      asset.newUrl = `${PULL_ZONE}/${asset.targetPath}`;
      logLine({ type: "asset", oldUrl, targetPath: asset.targetPath, newUrl: asset.newUrl, status: "dry-run" });
    } else {
      try {
        const buffer = await downloadFile(oldUrl);
        await uploadToBunny(asset.targetPath, buffer);
        await verifyBunnyUpload(asset.targetPath, buffer.length);
        asset.status = "success";
        asset.newUrl = `${PULL_ZONE}/${asset.targetPath}`;
        asset.size = buffer.length;
        logLine({ type: "asset", oldUrl, targetPath: asset.targetPath, newUrl: asset.newUrl, status: "success", size: buffer.length });
      } catch (err) {
        asset.status = "failed";
        asset.error = err.message;
        logLine({ type: "asset", oldUrl, targetPath: asset.targetPath, status: "failed", error: err.message });
      }
    }
    done++;
    if (done % 25 === 0 || done === items.length) {
      console.log(`  processed ${done}/${items.length} assets`);
    }
  });
}

// ── Step 3: apply successful migrations back to MongoDB ─────────────────────
async function applyDbUpdates(db, jobs, uniqueAssets, backupDocsByColl) {
  // group jobs by collection+docId
  const byDoc = new Map(); // key -> { collection, docId, sets: {field: value}, arrayFields: {field: [values]} }

  for (const job of jobs) {
    const asset = uniqueAssets.get(job.oldUrl);
    const key = `${job.collection}:${job.docId}`;
    if (!byDoc.has(key)) byDoc.set(key, { collection: job.collection, docId: job.docId, sets: {}, arrayFields: {} });
    const entry = byDoc.get(key);

    if (job.isArray) {
      if (!entry.arrayFields[job.field]) {
        const originalDoc = backupDocsByColl.get(job.collection).get(job.docId.toString());
        entry.arrayFields[job.field] = [...originalDoc[job.field]];
      }
      if (asset.status === "success" || asset.status === "dry-run") {
        entry.arrayFields[job.field][job.index] = asset.newUrl;
      }
      // failed: leave original cloudinary URL in place at that index
    } else {
      if (asset.status === "success" || asset.status === "dry-run") {
        entry.sets[job.field] = asset.newUrl;
      }
    }
  }

  const results = { updated: 0, skipped: 0, dbWriteErrors: [] };

  for (const entry of byDoc.values()) {
    const setDoc = { ...entry.sets, ...entry.arrayFields };
    if (Object.keys(setDoc).length === 0) {
      results.skipped++;
      continue;
    }

    if (DRY_RUN) {
      logLine({ type: "db-update", collection: entry.collection, docId: entry.docId, set: setDoc, status: "dry-run" });
      results.updated++;
      continue;
    }

    try {
      const coll = db.collection(entry.collection);
      const r = await coll.updateOne({ _id: new ObjectId(entry.docId) }, { $set: setDoc });
      logLine({ type: "db-update", collection: entry.collection, docId: entry.docId, set: setDoc, status: "success", matched: r.matchedCount, modified: r.modifiedCount });
      results.updated++;
    } catch (err) {
      logLine({ type: "db-update", collection: entry.collection, docId: entry.docId, set: setDoc, status: "failed", error: err.message });
      results.dbWriteErrors.push({ collection: entry.collection, docId: entry.docId.toString(), error: err.message });
    }
  }

  return results;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no uploads, no DB writes)" : "LIVE"}`);

  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db();

  console.log("\nStep 1: scanning DB for Cloudinary URLs...");
  const { jobs, backupDocsByColl } = await collectDbJobs(db);
  console.log(`Found ${jobs.length} DB field references across ${backupDocsByColl.size} collections.`);

  console.log("\nStep 2: writing backup...");
  writeBackup(backupDocsByColl);

  // Build the unique-asset map (DB jobs + hardcoded code URLs), deduped by source URL
  const uniqueAssets = new Map();
  for (const job of jobs) {
    if (!uniqueAssets.has(job.oldUrl)) uniqueAssets.set(job.oldUrl, { targetPath: job.targetPath, source: "db" });
  }
  const skippedCodeUrls = [];
  for (const codeUrl of CODE_URLS) {
    if (!codeUrl.url.includes("res.cloudinary.com")) {
      skippedCodeUrls.push(codeUrl.url);
      continue;
    }
    if (!uniqueAssets.has(codeUrl.url)) {
      uniqueAssets.set(codeUrl.url, { targetPath: codeUrl.targetPath(extractFilename(codeUrl.url)), source: "code" });
    }
  }

  console.log(`\nStep 3: processing ${uniqueAssets.size} unique Cloudinary assets (${DRY_RUN ? "dry run" : "downloading + uploading to Bunny"})...`);
  await processAssets(uniqueAssets);

  const succeeded = Array.from(uniqueAssets.values()).filter((a) => a.status === "success" || a.status === "dry-run").length;
  const failed = Array.from(uniqueAssets.entries()).filter(([, a]) => a.status === "failed");

  if (failed.length > 0) {
    const failuresFile = path.join(LOG_DIR, `failures-${RUN_ID}.json`);
    fs.writeFileSync(failuresFile, JSON.stringify(failed.map(([url, a]) => ({ url, targetPath: a.targetPath, error: a.error })), null, 2));
    console.log(`\n${failed.length} asset(s) failed — see ${failuresFile}`);
  }

  console.log("\nStep 4: applying DB updates...");
  const dbResults = await applyDbUpdates(db, jobs, uniqueAssets, backupDocsByColl);

  // ── Manual-fix report for hardcoded code URLs ──────────────────────────────
  const codeMappingFile = path.join(LOG_DIR, `code-url-mapping-${RUN_ID}.json`);
  const codeMapping = CODE_URLS.map((c) => {
    const asset = uniqueAssets.get(c.url);
    return { files: c.files, oldUrl: c.url, newUrl: asset ? asset.newUrl : null, status: asset ? asset.status : "unknown" };
  });
  fs.writeFileSync(codeMappingFile, JSON.stringify(codeMapping, null, 2));

  // ── Final summary ────────────────────────────────────────────────────────
  console.log("\n========== SUMMARY ==========");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Unique Cloudinary assets found: ${uniqueAssets.size}`);
  console.log(`  succeeded/would-succeed: ${succeeded}`);
  console.log(`  failed: ${failed.length}`);
  console.log(`DB documents updated (or would update): ${dbResults.updated}`);
  console.log(`DB documents skipped (nothing to change): ${dbResults.skipped}`);
  if (dbResults.dbWriteErrors.length) console.log(`DB write errors: ${dbResults.dbWriteErrors.length}`);
  console.log(`\nManual fix needed for ${CODE_URLS.length} hardcoded code URLs — see ${codeMappingFile}`);
  console.log(`Files to hand-edit: components/home-carousel.tsx, app/page.tsx, app/about-us/page.tsx, nezal-seed/seed-home-carousel.js`);
  console.log(`\nFull per-asset / per-doc log: ${path.join(LOG_DIR, `migration-${RUN_ID}.jsonl`)}`);
  console.log("==============================\n");

  logStream.end();
  await client.close();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
