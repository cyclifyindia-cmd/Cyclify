'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cheerio=require('cheerio');
const {merchantDescriptionFor}=require('./merchant-description');
const description=merchantDescriptionFor({
  name:'Example Road Tyre', description:'Shop Example Road Tyre at Cyclify for Rs 2500.',
  specs:['Size: 700 x 28C','Casing: 60 TPI','Size: 700 x 28C','Supplier: Private reference','Price: Rs 2500'],
  productFeatures:['Tubeless-ready construction','Reference: https://example.com/source'],
});
assert.ok(description.includes('700 x 28C'));
assert.ok(description.includes('60 TPI'));
assert.ok(description.includes('Tubeless-ready'));
assert.equal(description.match(/700 x 28C/g).length,1);
assert.ok(!/Rs 2500|Supplier|example\.com|Shop/.test(description));
assert.ok(merchantDescriptionFor({name:'Known model only'}).startsWith('Known model only'));
const root=path.resolve(__dirname,'..');
const feed=cheerio.load(fs.readFileSync(path.join(root,'google-merchant-feed.xml'),'utf8'),{xml:true});
let detailed=0;
feed('item').each((_,element)=>{
  const item=feed(element),description=item.find('description').text();
  const field=name=>item.find(name.replace(':','\\:')).first().text().trim();
  const link=field('link');
  assert.ok(description.length>0 && description.length<=4500);
  assert.ok(!/the\s*bike\s*affair|wesnap|cycletime\s*india|fcc\s*racing|choosemybicycle|cyclop\.in|headwind\.in|https?:\/\//i.test(description));
  for (const required of ['g:id','title','link','g:canonical_link','g:image_link','g:availability','g:condition','g:price','g:brand','g:product_type']) {
    assert.ok(field(required),'Merchant item missing '+required);
  }
  assert.equal(field('g:canonical_link'),link,'Canonical feed URL must match the product landing page');
  assert.match(field('g:image_link'),/^https:\/\//,'Merchant image must use a crawlable HTTPS URL');
  assert.match(field('g:price'),/^\d+(?:\.\d{2})? INR$/,'Merchant price must be INR');
  assert.ok(field('g:gtin')||field('g:mpn')||field('g:identifier_exists')==='no','Merchant item needs GTIN, MPN or identifier_exists=no');
  if (description.length>160) detailed++;
});
const paymentCatalog=JSON.parse(fs.readFileSync(path.join(root,'marketplace-backend/payment-function/functions/catalog.json'),'utf8'));
const routeContext={window:{}};
require('node:vm').runInNewContext(fs.readFileSync(path.join(root,'assets/js/product-routes.js'),'utf8'),routeContext);
const productRoutes=routeContext.window.CYCLIFY_PRODUCT_ROUTES;
const checkoutIds=Object.keys(paymentCatalog.products);
const missingRoutes=checkoutIds.filter(id=>!productRoutes[id]);
assert.deepEqual(missingRoutes,[],'Every checkout product must resolve to a canonical page');
const canonicalCheckoutRoutes=new Set(checkoutIds.map(id=>productRoutes[id]));
assert.equal(feed('item').length,canonicalCheckoutRoutes.size,'Shopping feed must contain one item per canonical checkout page');
assert.ok(detailed>100,'Use real product facts rather than short search snippets');
console.log('Shopping descriptions verified for '+feed('item').length+' canonical products across '+checkoutIds.length+' checkout IDs; '+detailed+' include more than a short search snippet, with no retailer references.');
