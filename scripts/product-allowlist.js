const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const allowlistPath = path.join(root, "assets", "data", "product-allowlist.json");

function loadAllowedProductIds() {
  const payload = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  if (payload.mode !== "allowlist" || !Array.isArray(payload.productIds)) {
    throw new Error("Invalid product allowlist configuration");
  }
  const ids = new Set(payload.productIds.map(value => String(value).trim()).filter(Boolean));
  if (!ids.size) throw new Error("Product allowlist must not be empty");
  return ids;
}

function filterAllowedProducts(products, allowedIds = loadAllowedProductIds()) {
  if (!Array.isArray(products)) throw new TypeError("Expected an array of products");
  return products.filter(product => allowedIds.has(String(product && product.id)));
}

module.exports = { allowlistPath, loadAllowedProductIds, filterAllowedProducts };
