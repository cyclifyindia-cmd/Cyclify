const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadAllowedProductIds, filterAllowedProducts } = require("./product-allowlist");
require('./apply-catalogue-policy');

const root = path.resolve(__dirname, "..");
const allowedIds = loadAllowedProductIds();
const htmlSources = [
  "product.html", "index.html", "accessories.html", "bicycle-tubes.html",
  "bike-computers.html", "bike-drivetrain.html", "bike-lights.html",
  "bikes-frames.html", "carbon-wheelsets.html", "components.html",
  "cycling-helmets.html", "cycling-sensors.html", "cycling-shoes.html",
  "electric-bike-pumps.html", "electronics.html", "elves-bikes.html",
  "sava-bikes.html", "smart-trainers.html", "wearables.html", "wheels-tyres.html"
];
const supplierFiles = [
  "assets/data/cycletime-products.json",
  "assets/data/fcc-products.json",
  "assets/data/cadence-products.json"
];

function arrayBounds(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = source.indexOf("[", markerIndex);
  if (start < 0) throw new Error(`Array start missing after ${marker}`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") { quote = char; continue; }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return { start, end: index + 1 };
    }
  }
  throw new Error(`Array end missing after ${marker}`);
}

function pruneInlineArray(relativePath, marker) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return { before: 0, after: 0 };
  const source = fs.readFileSync(absolutePath, "utf8");
  const bounds = arrayBounds(source, marker);
  if (!bounds) return { before: 0, after: 0 };
  const products = vm.runInNewContext(`(${source.slice(bounds.start, bounds.end)})`, Object.create(null), { timeout: 2000 });
  const filtered = filterAllowedProducts(products, allowedIds);
  const replacement = JSON.stringify(filtered, null, 2);
  fs.writeFileSync(absolutePath, source.slice(0, bounds.start) + replacement + source.slice(bounds.end), "utf8");
  return { before: products.length, after: filtered.length };
}

let removed = 0;
for (const relativePath of htmlSources) {
  const marker = relativePath === "index.html" ? "const searchProducts =" : "const products=";
  const result = pruneInlineArray(relativePath, marker);
  removed += result.before - result.after;
}

for (const relativePath of supplierFiles) {
  const absolutePath = path.join(root, relativePath);
  const payload = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  const before = payload.products.length;
  payload.products = filterAllowedProducts(payload.products, allowedIds);
  removed += before - payload.products.length;
  fs.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const tfsaPath = path.join(root, "assets", "js", "tfsa-products.js");
if (fs.existsSync(tfsaPath)) {
  const result = pruneInlineArray("assets/js/tfsa-products.js", "const tfsaProducts=");
  removed += result.before - result.after;
}

console.log(`Product allowlist applied: ${allowedIds.size} allowed IDs; ${removed} source records removed.`);
