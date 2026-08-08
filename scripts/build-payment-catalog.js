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

const catalog = new Map();
function writeFileWithRetry(file, content) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      fs.writeFileSync(file, content, "utf8");
      return;
    } catch (error) {
      const retryable = ["UNKNOWN", "EBUSY", "EPERM", "EACCES"].includes(error.code);
      if (!retryable || attempt === 8) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 40);
    }
  }
}

function addProduct(product, source) {
  const id = String(product.id ?? "").trim();
  const price = Number(product.price);
  if (!id || !product.name || !Number.isInteger(price) || price < 1) {
    throw new Error(`Invalid payment product in ${source}: ${id || "missing id"}`);
  }
  const record = {
    id,
    name: String(product.name),
    price,
    available: product.available !== false,
    image: String(product.image || ""),
    sizes: Array.isArray(product.sizes) ? product.sizes.map(String) : [],
    sizeAvailability: product.sizeAvailability && typeof product.sizeAvailability === "object" ? product.sizeAvailability : {},
    sourcePage: product.categoryPage || source,
  };
  catalog.set(id, record);
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

const output = {
  generatedAt: new Date(Math.max(
    ...pages.map(file => fs.statSync(path.join(root, file)).mtimeMs),
    ...dataFiles.map(file => fs.statSync(path.join(root, "assets", "data", file)).mtimeMs),
  )).toISOString(),
  currency: "INR",
  products: Object.fromEntries([...catalog.entries()].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))),
};
const outputPath = path.join(root, "marketplace-backend", "payment-function", "functions", "catalog.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileWithRetry(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Payment catalog: ${catalog.size} products -> ${path.relative(root, outputPath)}`);
