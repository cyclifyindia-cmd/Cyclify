'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cheerio=require('cheerio');
const {campaign}=require('./campaign-pricing');
const read=file=>fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
const base=vm.runInNewContext('('+read('product.html').match(/const products=(\[[\s\S]*?\]);/)[1]+')');
const active='2026-10-20T12:00:00+05:30';
const rules=campaign.config.products;
const {validatedCart}=require('../marketplace-backend/payment-function/functions/index')._test;
assert.equal(Object.keys(rules).length,8);
assert.equal(campaign.ruleFor('38'),null,'XX PRO has no extra campaign discount');
const xxpro=base.find(p=>String(p.id)==='38');
assert.equal(xxpro.price,51999);
assert.equal(Number(xxpro.mrp.replace(/[^0-9.]/g,'')),65499);
for(const time of [active,'2026-11-11T00:00:00+05:30']){
 assert.equal(campaign.resolveProduct(xxpro,time).price,51999);
 for(const size of xxpro.sizes)assert.equal(validatedCart([{id:'38',price:1,size,quantity:1}],Date.parse(time)).total,51999);
}
assert.equal(campaign.isActive('2026-11-10T23:59:59+05:30'),true);
assert.equal(campaign.isActive('2026-11-11T00:00:00+05:30'),false);
assert.equal(campaign.isActive('2026-10-15T23:59:59+05:30'),false);
const feed=cheerio.load(read('google-merchant-feed.xml'),{xmlMode:true});
const routes={window:{}};vm.runInNewContext(read('assets/js/product-routes.js'),routes);
const xxproFeed=feed('item').filter((_,el)=>feed(el).find('g\\:id').text()==='CYCLIFY-38');
assert.equal(xxproFeed.children('g\\:price').text(),'65499.00 INR');
assert.equal(xxproFeed.children('g\\:sale_price').text(),'51999.00 INR','MRP reduction is separate from the removed campaign discount');
const xxproPage=cheerio.load(read(routes.window.CYCLIFY_PRODUCT_ROUTES['38']));
const xxproSchema=JSON.parse(xxproPage('#cyclify-product-schema').text())['@graph'].find(p=>p['@type']==='Product');
assert.equal(Number(xxproSchema.offers.price),51999);
assert.equal(xxproPage('#campaignProductOffer').length,0,'No obsolete campaign note');
for(const [id,rule] of Object.entries(rules)){
 const p=base.find(p=>String(p.id)===id);assert(p,`Missing source ${id}`);assert.equal(p.price,rule.regularPrice);
 const sale=campaign.resolveProduct(p,active);assert.equal(sale.price,id==='36'?29999:Math.round(rule.regularPrice*90)/100);
 assert.equal(campaign.resolveProduct(sale,'2026-11-11T00:00:00+05:30').price,rule.regularPrice);
 assert.equal(campaign.resolveProduct(sale,active).price,sale.price,'No stacking');
 assert.equal(campaign.resolveProduct(p,active).available,p.available,'Preserve stock');
 const size=(p.sizes||[]).find(size=>p.sizeAvailability?.[size]!==false)||'';
 if(p.available!==false){
  const cart=validatedCart([{id,price:1,size,quantity:3,valveLength:p.valveLengths?.[0]||''}],new Date(active).getTime());
  assert.equal(Math.round(cart.total*100),campaign.toPaise(rule.salePrice)*3);
  assert.equal(validatedCart([{id,size,quantity:1,valveLength:p.valveLengths?.[0]||''}],Date.parse('2026-11-11T00:00:00+05:30')).total,rule.regularPrice);
 }
 const item=feed('item').filter((_,el)=>feed(el).find('g\\:id').text()==='CYCLIFY-'+id);assert.equal(item.length,1);
 assert.equal(item.children('g\\:price').text(),rule.regularPrice.toFixed(2)+' INR');
 if(campaign.isActive()){
  assert.equal(item.children('g\\:sale_price').text(),rule.salePrice.toFixed(2)+' INR');
  assert.equal(item.children('g\\:sale_price_effective_date').text(),campaign.config.startsAt+'/'+campaign.config.endsAt);
 }
}
const sample=campaign.resolveProduct({id:88003,price:99999},active);assert.equal(sample.price,99999);
assert.throws(()=>campaign.toPaise(1.001),/Invalid/);
assert.equal(campaign.formatPrice(449.1),'449.10');
assert(read('sitemap.xml').includes('https://cyclify.in/winter-deals.html'));
assert(read('diwali-deals.html').includes('window.location.replace("/winter-deals.html"+location.hash)'), 'Legacy campaign links retain their destination anchors');
const page=cheerio.load(read('winter-deals.html'));assert.equal(page('.diwali-card').length,12);assert.equal(page('#diwaliHelpForm').length,1);
// The sale still expires automatically; its deadline is not advertised in visible copy.
const advertisedDeadline=/\b(?:10\s+nov(?:ember)?|nov(?:ember)?\s+10)\b/i;
for(const file of ['index.html','winter-deals.html']){
 const $=cheerio.load(read(file));$('script,style').remove();
 assert.equal(advertisedDeadline.test($('body').text()),false,`${file} advertises the removed deadline`);
 assert.equal(advertisedDeadline.test($('meta[name="description"]').attr('content')||''),false,`${file} advertises the deadline in search copy`);
}
for(const id of Object.keys(rules)){
 const $=cheerio.load(read(routes.window.CYCLIFY_PRODUCT_ROUTES[id]));
 assert.equal(advertisedDeadline.test($('#campaignProductOffer').text()),false,`Product ${id} advertises the removed deadline`);
}
assert.equal(advertisedDeadline.test(campaign.config.terms),false);
assert(read('assets/js/diwali-campaign.js').includes(campaign.config.endsAt));
const closed=cheerio.load(require('./build-diwali-page').buildDiwaliPage(base,routes.window.CYCLIFY_PRODUCT_ROUTES||{},{now:'2026-11-11T00:00:00+05:30',write:false}));
assert(closed('title').text().includes('Current Offers'));
assert.equal(closed('[data-product-id="36"] [data-live-price]').text(),'₹35,000');
assert.equal(closed('[data-regular-price]').length,0);
console.log('Diwali: 8 offers, XX PRO fixed at INR 51,999, exact paise, no stacking, stock, server authority, end-date restoration, feed dates, 12 featured products and enquiry form verified.');
