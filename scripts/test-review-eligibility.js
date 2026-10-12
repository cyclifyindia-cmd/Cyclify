'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/product-reviews.js', 'utf8');
const filter = source.match(/\.filter\(review=>\n([\s\S]*?)\n\)\.sort/);
assert.ok(filter, 'Review eligibility filter must exist');
const eligible = vm.runInNewContext('(review) => (' + filter[1] + ')');
const real = { status: 'approved', verifiedPurchase: true, orderId: 'order-1', rating: 5, comment: 'Fits well.' };
assert.equal(eligible(real), true);
for (const change of [
  { status: 'pending' }, { verifiedPurchase: false }, { orderId: '' },
  { rating: 0 }, { rating: 6 }, { rating: '5' }, { rating: 4.5 }, { comment: ' ' }
]) assert.equal(eligible({ ...real, ...change }), false);
console.log('Review eligibility: approved verified purchase accepted; 8 invalid cases rejected.');
