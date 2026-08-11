import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const repo = path.resolve(import.meta.dirname, "..", "..");
const outputFile = path.join(import.meta.dirname, "Price Corrections.csv");
const clipboardFile = path.join(import.meta.dirname, "Price Corrections.tsv");
const formulaFile = path.join(import.meta.dirname, "Price Corrections.formula.txt");
const context = { window: {} };
vm.createContext(context);
const routeCode = await fs.readFile(path.join(repo, "assets", "js", "product-routes.js"), "utf8");
vm.runInContext(routeCode, context, { filename: "product-routes.js" });

const pages = [
  "accessories.html", "bicycle-tubes.html", "bike-computers.html",
  "bike-drivetrain.html", "bike-lights.html", "bikes-frames.html",
  "carbon-wheelsets.html", "components.html", "cycling-helmets.html",
  "cycling-sensors.html", "cycling-shoes.html", "electric-bike-pumps.html",
  "electronics.html", "elves-bikes.html", "sava-bikes.html",
  "smart-trainers.html", "wearables.html", "wheels-tyres.html",
];
const dataFiles = ["cycletime-products.json", "fcc-products.json", "cadence-products.json"];
const catalogue = new Map();

function addProduct(item, sourcePage) {
  if (!item || item.id == null || !item.name) return;
  catalogue.set(String(item.id), { ...item, sourcePage: item.categoryPage || sourcePage });
}

for (const page of pages) {
  const html = await fs.readFile(path.join(repo, page), "utf8");
  const match = html.match(/const\s+products\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error(`Could not locate the product array in ${page}.`);
  const items = vm.runInNewContext(`(${match[1]})`);
  items.forEach((item) => addProduct(item, page));
}

for (const file of dataFiles) {
  const payload = JSON.parse(await fs.readFile(path.join(repo, "assets", "data", file), "utf8"));
  if (!Array.isArray(payload.products)) throw new Error(`Could not locate products in ${file}.`);
  payload.products.forEach((item) => addProduct(item, file));
}

const products = [...catalogue.values()].sort((a, b) =>
  String(a.id).localeCompare(String(b.id), "en", { numeric: true })
);

function moneyNumber(value) {
  return Math.round(Number(String(value ?? "").replace(/[^0-9.]/g, "")) || 0);
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

const routes = context.window.CYCLIFY_PRODUCT_ROUTES || {};
const rows = products
  .map((item, index) => {
    const price = Math.round(Number(item.price) || 0);
    let mrp = moneyNumber(item.mrp);
    if (!mrp && Array.isArray(item.variants)) {
      mrp = Math.max(0, ...item.variants.map((variant) => moneyNumber(variant.compare_at_price)));
    }
    const status = item.available === false ? "Out of Stock" : "In Stock";
    const issues = [];
    if (!mrp) issues.push("MRP missing");
    if (mrp && price > mrp) issues.push("Cyclify price above MRP");
    if (mrp && price === mrp) issues.push("Price equals MRP");
    if (status === "Out of Stock") issues.push("Out of stock");
    const route = routes[String(item.id)] || `product.html?id=${encodeURIComponent(item.id)}`;
    return [
      index + 1,
      String(item.id),
      cleanText(item.name),
      status,
      mrp || "",
      price,
      mrp ? mrp - price : "",
      issues.join("; ") || "OK",
      "",
      "",
      "",
      `https://cyclify.in/${route}`,
      cleanText(item.stockSource || item.categoryLabel || item.sourcePage || "Cyclify"),
    ];
  });

const headers = [
  "No.",
  "Product ID",
  "Product Name",
  "Stock Status",
  "Current MRP",
  "Current Cyclify Price",
  "Current Saving",
  "Check / Issue",
  "Corrected MRP",
  "Corrected Cyclify Price",
  "Correction Notes",
  "Product URL",
  "Source",
];

const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
await fs.writeFile(outputFile, `\uFEFF${csv}`, "utf8");
const tsv = [headers, ...rows]
  .map((row) => row.map((value) => String(value ?? "").replace(/[\t\r\n]+/g, " ")).join("\t"))
  .join("\r\n");
await fs.writeFile(clipboardFile, tsv, "utf8");
function formulaValue(value) {
  if (typeof value === "number") return String(value);
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
const sheetFormulaRows = [
  ["No.", "Product ID", "Product Name", "Stock Status", "Current MRP", "Current Cyclify Price", "Check / Issue"],
  ...rows.map((row) => [row[0], row[1], row[2], row[3], row[4], row[5], row[7]]),
];
const sheetFormula = `={${sheetFormulaRows.map((row) => row.map(formulaValue).join(",")).join(";")}}`;
await fs.writeFile(formulaFile, sheetFormula, "utf8");

const summary = {
  total: rows.length,
  inStock: rows.filter((row) => row[3] === "In Stock").length,
  outOfStock: rows.filter((row) => row[3] === "Out of Stock").length,
  priceAboveMrp: rows.filter((row) => String(row[7]).includes("above MRP")).length,
  mrpMissing: rows.filter((row) => String(row[7]).includes("MRP missing")).length,
  priceEqualsMrp: rows.filter((row) => String(row[7]).includes("Price equals MRP")).length,
  formulaLength: sheetFormula.length,
  outputFile,
};
console.log(JSON.stringify(summary, null, 2));
