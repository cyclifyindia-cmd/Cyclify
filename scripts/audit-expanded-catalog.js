const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const products = JSON.parse(read('assets/data/expanded-products.json')).products;
const deferred = JSON.parse(read('assets/data/deferred-products.json'));
const payment = JSON.parse(read('marketplace-backend/payment-function/functions/catalog.json')).products;
const context = {window:{}};
vm.runInNewContext(read('assets/js/product-routes.js'), context);
const routes = context.window.CYCLIFY_PRODUCT_ROUTES;
const merchant = cheerio.load(read('google-merchant-feed.xml'), {xml:true});
const prohibited = /the\s*bike\s*affair|thebikeaffair|wesnap|dealer price/i;
assert.equal(products.length, 165);
assert.equal(deferred.products.length, 57);
assert.equal(products.filter(product => product.brand === 'Tripeak' && product.available).length, 15);
let variants = 0;
for (const product of products) {
  const name = product.name;
  assert(!prohibited.test(JSON.stringify(product)), name + ': external retailer information');
  const selection = product.purchaseVariants.find(variant=>variant.key===product.defaultVariantKey);
  assert(selection, name + ': default selection');
  assert.equal(product.price, selection.price, name + ': initial price');
  assert.equal(product.image, selection.image, name + ': initial photo');
  assert.equal(product.available, product.purchaseVariants.some(variant=>variant.available), name + ': model stock');
  assert.equal(product.available, payment[product.id]?.available, name + ': trusted model stock');
  for (const variant of product.purchaseVariants) {
    variants++;
    assert(Number.isInteger(variant.price) && variant.price > 0, name + ': valid INR price');
    assert.equal(variant.available, variant.stockStatus === 'available', name + ': option stock');
    assert.deepEqual(payment[product.id].purchaseVariants[variant.key], {
      price:variant.price, available:variant.available, size:variant.size, colour:variant.colour,
      build:variant.build, image:variant.image, stockStatus:variant.stockStatus,
    }, name + ': trusted option consistency');
  }
  for (const image of product.images) {
    assert(/^assets\/products\/expanded\/[a-f0-9]+\.webp$/.test(image), name + ': local photo');
    for (const file of [image, image.replace('/expanded/', '/expanded/thumbs/')]) assert(fs.statSync(path.join(root,file)).size > 100, name + ': photo file ' + file);
  }
  const route = routes[product.id];
  assert(route, name + ': canonical route');
  const html = read(route);
  const $ = cheerio.load(html);
  assert(!prohibited.test(html), name + ': retailer information in generated page');
  assert.equal($('#productName').text(), name);
  assert.equal($('.expanded-product').length, 1, name + ': Cyclify layout');
  assert.equal($('#expandedStock').text(), product.stockStatus==='coming-soon'?'Coming Soon':product.available?'In stock':'Contact for More Info');
  assert.equal($('#productImage').attr('src'), 'https://cyclify.in/'+product.image);
  if (!product.available) assert.equal($('#productButtons button:disabled').length, 2, name + ': unavailable purchase controls');
  const item = merchant('item').filter((_,element)=>merchant(element).find('g\\:id').text()==='CYCLIFY-'+product.id);
  assert.equal(item.length, 1, name + ': Merchant feed item');
  assert.equal(item.find('g\\:availability').text(), product.available?'in_stock':'out_of_stock', name + ': Merchant stock');
  assert.equal(item.children('g\\:sale_price').text() || item.children('g\\:price').text(), product.price.toFixed(2)+' INR', name + ': Merchant selling price');
}
console.log(`Expanded catalogue verified: ${products.length} models, ${variants} selections, 15 available Tripeak models, 57 deferred models, local photos and consistent checkout/feed.`);
