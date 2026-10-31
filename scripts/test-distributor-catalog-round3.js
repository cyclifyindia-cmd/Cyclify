'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const payload = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/distributor-products-3.json'), 'utf8'));
const products = payload.products;
const fail = message => { throw new Error(message); };

if (products.length !== 170) fail(`Expected 170 retained products, received ${products.length}`);
if (products.filter(product => product.available).length !== 129) fail('Expected 129 in-stock products');
if (products.filter(product => product.stockStatus === 'coming-soon').length !== 41) fail('Expected 41 Coming Soon products');
const expectedBrands = { Tifosi: 0, Ravemen: 0, 'Safety Labs': 27, Tacx: 9, Polygon: 58, Merida: 76 };
for (const [brand, count] of Object.entries(expectedBrands)) {
  const actual = products.filter(product => product.brand === brand).length;
  if (actual !== count) fail(`Expected ${count} ${brand} products, received ${actual}`);
}
if (new Set(products.map(product => String(product.id))).size !== products.length) fail('Duplicate product IDs found');
for (const product of products) {
  if (!Number.isInteger(product.price) || product.price < 1) fail(`Invalid price: ${product.name}`);
  if (!Number.isInteger(product.mrp) || product.mrp < product.price) fail(`Invalid MRP: ${product.name}`);
  if (product.available !== (product.stockQuantity > 0)) fail(`Stock mismatch: ${product.name}`);
  if (!fs.existsSync(path.join(root, product.image))) fail(`Missing photo: ${product.name}`);
  if (!fs.existsSync(path.join(root, product.image.replace('/distributor-3/', '/distributor-3/thumbs/')))) fail(`Missing thumbnail: ${product.name}`);
  if (/dealer price|order value|\bdp\b/i.test(JSON.stringify(product))) fail(`Private distributor data leaked: ${product.name}`);
  if (product.purchaseVariants) {
    for (const variant of product.purchaseVariants) {
      if (variant.available !== (variant.stockQuantity > 0)) fail(`Variant stock mismatch: ${product.name}`);
      if (!Number.isInteger(variant.price) || variant.price < 1) fail(`Invalid variant price: ${product.name}`);
    }
  }
}
if ((payload.audit.held || []).length !== 0) fail(`Products were held: ${JSON.stringify(payload.audit.held)}`);
console.log('Retained round-three catalogue verified: 170 products, 129 available, 41 Coming Soon, four brands, complete photos and valid variants.');
