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
  assert.ok(description.length>0 && description.length<=4500);
  assert.ok(!/the\s*bike\s*affair|wesnap|cycletime\s*india|fcc\s*racing|choosemybicycle|cyclop\.in|headwind\.in|https?:\/\//i.test(description));
  if (description.length>160) detailed++;
});
const paymentCatalog=JSON.parse(fs.readFileSync(path.join(root,'marketplace-backend/payment-function/functions/catalog.json'),'utf8'));
assert.equal(feed('item').length,Object.keys(paymentCatalog.products).length);
assert.ok(detailed>100,'Use real product facts rather than short search snippets');
console.log('Shopping descriptions verified for '+feed('item').length+' products; '+detailed+' include more than a short search snippet, with no retailer references.');
