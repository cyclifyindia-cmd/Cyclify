'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cheerio=require('cheerio');
const {campaign}=require('./campaign-pricing');
const read=file=>fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
const base=vm.runInNewContext('('+read('product.html').match(/const products=(\[[\s\S]*?\]);/)[1]+')');
const active='2026-10-20T12:00:00+05:30';
const rules=campaign.config.products;
assert.equal(Object.keys(rules).length,9);
assert.equal(campaign.isActive('2026-11-10T23:59:59+05:30'),true);
assert.equal(campaign.isActive('2026-11-11T00:00:00+05:30'),false);
assert.equal(campaign.isActive('2026-10-15T23:59:59+05:30'),false);
const {validatedCart}=require('../marketplace-backend/payment-function/functions/index')._test;
const feed=cheerio.load(read('google-merchant-feed.xml'),{xmlMode:true});
const routes={window:{}};vm.runInNewContext(read('assets/js/product-routes.js'),routes);
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
assert(read('sitemap.xml').includes('https://cyclify.in/diwali-deals.html'));
const page=cheerio.load(read('diwali-deals.html'));assert.equal(page('.diwali-card').length,12);assert.equal(page('#diwaliHelpForm').length,1);
// The sale still expires automatically; its deadline is not advertised in visible copy.
const advertisedDeadline=/\b(?:10\s+nov(?:ember)?|nov(?:ember)?\s+10)\b/i;
for(const file of ['index.html','diwali-deals.html']){
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
console.log('Diwali: 9 prices, exact paise, no stacking, stock, server authority, end-date restoration, feed dates, 12 featured products and enquiry form verified.');
