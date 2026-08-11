const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const pages = [
  "accessories.html", "bicycle-tubes.html", "bike-computers.html",
  "bike-drivetrain.html", "bike-lights.html", "bikes-frames.html",
  "carbon-wheelsets.html", "components.html", "cycling-helmets.html",
  "cycling-sensors.html", "cycling-shoes.html", "electric-bike-pumps.html",
  "electronics.html", "elves-bikes.html", "sava-bikes.html",
  "smart-trainers.html", "wearables.html", "wheels-tyres.html",
];
const dataFiles = ["cycletime-products.json", "fcc-products.json", "cadence-products.json"];
const expected = new Map();

function addProduct(product, source) {
  const id = String(product.id ?? "").trim();
  const price = Number(product.price);
  if (!id || !product.name || !Number.isInteger(price) || price < 1) {
    throw new Error(`Invalid source product in ${source}: ${id || "missing id"}`);
  }
  expected.set(id, {
    id,
    name: String(product.name),
    price,
    available: product.available !== false,
    image: String(product.image || ""),
    sizes: Array.isArray(product.sizes) ? product.sizes.map(String) : [],
    sizeAvailability: product.sizeAvailability && typeof product.sizeAvailability === "object" ? product.sizeAvailability : {},
    sourcePage: product.categoryPage || source,
  });
}

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  const match = html.match(/const\s+products\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error(`Product array missing in ${page}`);
  const products = vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 1000 });
  products.forEach(product => addProduct(product, page));
}

for (const file of dataFiles) {
  const payload = JSON.parse(fs.readFileSync(path.join(root, "assets", "data", file), "utf8"));
  if (!Array.isArray(payload.products)) throw new Error(`Product list missing in ${file}`);
  payload.products.forEach(product => addProduct(product, file));
}

const catalogPath = path.join(root, "marketplace-backend", "payment-function", "functions", "catalog.json");
const payload = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
if (payload.currency !== "INR" || !payload.products || typeof payload.products !== "object") {
  throw new Error("Payment catalogue has an invalid structure or currency");
}

const actual = new Map(Object.entries(payload.products));
const issues = [];
const checkedFields = ["id", "name", "price", "available", "image", "sizes", "sizeAvailability", "sourcePage"];

for (const [id, sourceProduct] of expected) {
  const paymentProduct = actual.get(id);
  if (!paymentProduct) {
    issues.push(`Missing from payment catalogue: ${id} ${sourceProduct.name}`);
    continue;
  }
  for (const field of checkedFields) {
    if (JSON.stringify(paymentProduct[field]) !== JSON.stringify(sourceProduct[field])) {
      issues.push(`Mismatch for ${id} (${field})`);
    }
  }
}

for (const [id, paymentProduct] of actual) {
  if (!expected.has(id)) {
    issues.push(`Not present on website or supplier feeds: ${id} ${paymentProduct.name || ""}`.trim());
  }
}

if (issues.length) {
  console.error(`Payment catalogue verification failed with ${issues.length} issue(s):`);
  issues.slice(0, 50).forEach(issue => console.error(`- ${issue}`));
  if (issues.length > 50) console.error(`- ...and ${issues.length - 50} more`);
  process.exitCode = 1;
} else {
  console.log(`Payment catalogue verified: ${expected.size} website products match secure checkout data.`);
}
