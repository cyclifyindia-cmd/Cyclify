'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const payload = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/distributor-products-2.json'), 'utf8'));
const products = payload.products;
const productFiles = new Set(fs.readdirSync(path.join(root, 'products')));
const fail = message => { throw new Error(message); };
if (products.length !== 0) fail('Round-two brands and Merida accessories were explicitly removed; source must remain empty');
for (const product of products) {
  if (!product.priceOnRequest && (!Number.isInteger(product.price) || product.price < 1)) fail(`Invalid price: ${product.name}`);
  if (!product.priceOnRequest && (!Number.isInteger(product.mrp) || product.mrp < product.price)) fail(`Invalid MRP: ${product.name}`);
  if (!product.priceOnRequest && product.available !== (product.stockQuantity > 0)) fail(`Stock mismatch: ${product.name}`);
  if (!fs.existsSync(path.join(root, product.image))) fail(`Missing photo: ${product.name}`);
  if (/dealer price|order value|buy \d+\s*&\s*get/i.test(JSON.stringify(product))) fail(`Private promotion leaked: ${product.name}`);
  if (product.purchaseVariants) {
    for (const variant of product.purchaseVariants) {
      if (variant.available !== (variant.stockQuantity > 0)) fail(`Variant stock mismatch: ${product.name}`);
      if (!Number.isInteger(variant.price) || variant.price < 1) fail(`Invalid variant price: ${product.name}`);
    }
  }
  const suffix = '-' + String(product.id) + '.html';
  const route = [...productFiles].find(file => file.endsWith(suffix));
  if (!route) fail(`Missing product page: ${product.name}; suffix=${JSON.stringify(suffix)}; sample=${[...productFiles].filter(file => file.includes(String(product.id))).slice(0, 3).join(',')}`);
}
if (payload.audit.held.length !== 0) fail(`No photo-only products should be held: ${JSON.stringify(payload.audit.held)}`);
if (payload.audit.sourcedImages.length !== 42) fail(`Expected 42 sourced images, received ${payload.audit.sourcedImages.length}`);
if (payload.audit.mrpFallbacks.length !== 6) fail('Expected six Pearl Izumi MRP fallbacks');
console.log('Round-two catalogue exclusions verified: no removed brands or Merida accessories remain.');
