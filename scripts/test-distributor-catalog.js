'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const payload = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/distributor-products.json'), 'utf8'));
const products = payload.products;
const fail = message => { throw new Error(message); };
if (products.length !== 94) fail(`Expected 94 products, received ${products.length}`);
if (products.filter(product => product.available).length !== 69) fail('Expected 69 in-stock products');
if (products.filter(product => product.stockStatus === 'coming-soon').length !== 25) fail('Expected 25 Coming Soon products');
for (const product of products) {
  if (!Number.isInteger(product.price) || product.price < 1) fail(`Invalid price: ${product.name}`);
  if (!Number.isInteger(product.mrp) || product.mrp < product.price) fail(`Invalid MRP: ${product.name}`);
  if (product.available !== (product.stockQuantity > 0)) fail(`Stock mismatch: ${product.name}`);
  if (!fs.existsSync(path.join(root, product.image))) fail(`Missing photo: ${product.name}`);
  if (/dealer price|\bdp\s*\(|buy \d+\s*&\s*get|flat \d+% on/i.test(JSON.stringify(product))) fail(`Dealer promotion leaked: ${product.name}`);
  const route = fs.readdirSync(path.join(root, 'products')).find(file => file.endsWith(`-${product.id}.html`));
  if (!route) fail(`Missing product page: ${product.name}`);
}
const researched = new Map(payload.audit.researchedPrices.map(item => [item.model, item]));
for (const model of ['0165001', '0172001', '0192003P', '121026', '0121006']) {
  if (!researched.has(model)) fail(`Missing researched price: ${model}`);
}
if (payload.audit.held.length !== 1 || payload.audit.held[0].model !== '016041229') fail('Unexpected held-product audit');
console.log('Distributor catalogue verified: 94 products, 69 available, 25 Coming Soon, 1 held for missing photo.');
