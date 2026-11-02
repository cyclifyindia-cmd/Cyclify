'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),vm=require('vm'),cheerio=require('cheerio');
const read=f=>fs.readFileSync(require('path').join(__dirname,'..',f),'utf8');
const source=JSON.parse(read('assets/data/expanded-products.json')).products;
const batch=JSON.parse(read('assets/data/cyclami-batch.json'));
const trusted=JSON.parse(read('marketplace-backend/payment-function/functions/catalog.json')).products;
const prices=[4129,1769,1415,5309,4129,5663,7079,4129,1415,2949,3067,3539,1179,1415,2595,2949,3539,2595,1533,2005,2949,2949,3303,589,825,589,1533,1061,235,707,825,589,2359,2359,2359];
const context={window:{}};vm.runInNewContext(read('assets/js/product-routes.js'),context);
assert.equal(batch.products.length,35);assert.equal(batch.held.length,0);
const feed=cheerio.load(read('google-merchant-feed.xml'),{xml:true});
for(let n=1;n<=35;n++){const id=940000+n,p=source.find(p=>p.id===id);assert(p,'Missing item '+n);assert.equal(p.price,prices[n-1]);assert.equal(p.mrp,Math.round(p.price*120)/100);assert(p.available);assert.equal(p.brand,n===12?'XOSS':'CYCLAMI');assert.equal(trusted[id].price,p.price);assert(read('sitemap.xml').includes(context.window.CYCLIFY_PRODUCT_ROUTES[id]));assert(read('assets/js/search-index.js').includes(String(id)));const item=feed('item').filter((_,e)=>feed(e).find('g\\:id').text()==='CYCLIFY-'+id);assert.equal(item.length,1);const html=read(context.window.CYCLIFY_PRODUCT_ROUTES[id]);assert(html.includes('application/ld+json'));assert(html.includes(p.name));for(const v of p.purchaseVariants){assert.equal(trusted[id].purchaseVariants[v.key].price,p.price);assert(v.available);}}
for(let n=36;n<=40;n++)assert(!source.some(p=>p.id===940000+n));
assert.deepEqual(source.find(p=>p.id===940032).secondaryOptions,['Black','Pink','White','Green','Orange']);
for(const id of [940030,940031])assert(source.find(p=>p.id===id).specs.some(s=>s.includes('two valves')));
assert(source.find(p=>p.id===940021).specs.includes('Unit: One pulley'));
assert(source.find(p=>p.id===940014).specs.includes('Included: Bottle cage and locator'));
for(const f of ['brand-cyclami.html','brand-xoss.html','cycling-brands-india.html']){assert(read('sitemap.xml').includes(f));assert(read(f).includes('CollectionPage'));}
assert(read('index.html').includes('cycling-brands-india.html'));
console.log('35 confirmed products: prices, MRP, stock, variants, local photos, canonical routes, structured data, sitemap, feed, trusted checkout and brand discovery verified.');
