const fs = require("node:fs");
const path = require("node:path");

const overridesPath = path.resolve(__dirname, "..", "assets", "data", "price-overrides.json");
const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));

function formatMrp(value) {
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function applyPriceOverrides(products) {
  products.forEach(product => {
    const override = overrides[String(product.id)];
    if (!override) return;
    product.price = Number(override.price);
    product.mrp = formatMrp(override.mrp);
    if (Array.isArray(product.variants)) {
      product.variants.forEach(variant => {
        variant.price = Number(override.price);
        variant.compare_at_price = Number(override.mrp);
      });
    }
  });
  return products;
}

module.exports = { overrides, applyPriceOverrides, formatMrp };
