'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cheerio=require('cheerio');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const products=JSON.parse(read('assets/data/2xu-products.json')).products;
const payment=JSON.parse(read('marketplace-backend/payment-function/functions/catalog.json')).products;
const context={window:{}};vm.runInNewContext(read('assets/js/product-routes.js'),context);vm.runInNewContext(read('assets/js/search-index.js'),context);
const feed=cheerio.load(read('google-merchant-feed.xml'),{xmlMode:true});
const allowed=new Set(JSON.parse(read('assets/data/product-allowlist.json')).productIds.map(String));
const {validatedCart}=require('../marketplace-backend/payment-function/functions/index')._test;
const removed=require('./product-allowlist').loadCataloguePolicy().removedBrands.includes('2XU');
assert.equal(products.length,removed?0:113);assert.equal(new Set(products.map(p=>p.model)).size,products.length);
if(removed){assert(!context.window.CYCLIFY_SEARCH_PRODUCTS.some(p=>p.brand==='2XU'));assert(!Object.values(payment).some(p=>p.name.startsWith('2XU ')));}
let variants=0,available=0;
for(const p of products){
 assert(allowed.has(String(p.id)));assert.equal(p.priceLabel,'SPECIAL PROMO');
 assert(!/thebikeaffair|the bike affair|dealer price|supplier/i.test(JSON.stringify(p)));
 const initial=p.purchaseVariants.find(v=>v.key===p.defaultVariantKey);assert(initial);assert.equal(p.price,initial.price);assert.equal(p.mrp,initial.mrp);assert.equal(p.image,initial.image);
 assert.equal(p.available,p.purchaseVariants.some(v=>v.available));
 const route=context.window.CYCLIFY_PRODUCT_ROUTES[p.id],html=read(route),$=cheerio.load(html);
 assert.equal($('#productName').text(),p.name);assert.equal($('#productDealWord').text(),'SPECIAL PROMO');
 assert($('#productMrp').text().includes(p.mrp.toLocaleString('en-IN')));assert(read('sitemap.xml').includes(route));
 assert(context.window.CYCLIFY_SEARCH_PRODUCTS.some(x=>x.id===p.id||String(x.id)===String(p.id)));
 assert(read(p.categoryPage).includes(route));
 const schema=JSON.parse($('#cyclify-product-schema').text())['@graph'].find(x=>x['@type']==='Product');assert.equal(schema.offers.price,String(p.price));assert.equal(schema.mpn,p.model);
 const item=feed('item').filter((_,e)=>feed(e).find('g\\:id').text()==='CYCLIFY-'+p.id);assert.equal(item.length,1);
 assert.equal(item.children('g\\:sale_price').text()||item.children('g\\:price').text(),p.price.toFixed(2)+' INR');
 assert.equal(item.find('g\\:availability').text(),p.available?'in_stock':'out_of_stock');
 for(const image of p.images){assert(fs.statSync(path.join(root,image)).size>100);assert(fs.statSync(path.join(root,image.replace('/2xu/','/2xu/thumbs/'))).size>100);}
 for(const v of p.purchaseVariants){
  variants++;assert(Number.isInteger(v.price)&&v.price>0&&v.price<=v.mrp);assert.equal(v.available,v.stockStatus==='available');
  assert.deepEqual(payment[p.id].purchaseVariants[v.key],{price:v.price,available:v.available,size:v.size,colour:v.colour,build:v.build,image:v.image,stockStatus:v.stockStatus});
  const cart={id:String(p.id),quantity:1,variantKey:v.key,size:v.size,valveLength:v.colour,configuration:v.build,price:1};
  if(v.available){available++;assert.equal(validatedCart([cart]).total,v.price);assert.throws(()=>validatedCart([{...cart,size:'INVALID'}]),/invalid/);}
  else assert.throws(()=>validatedCart([cart]));
 }
 if(p.available)assert.throws(()=>validatedCart([{id:String(p.id),quantity:1,price:1}]),/valid option/);
}
// Independent reconciliation to original extracted source rows when available locally.
const auditPath=path.join(root,'.preview-tools/2xu/inventory-audit.json');
if(fs.existsSync(auditPath)){
 const source=JSON.parse(fs.readFileSync(auditPath,'utf8')),alias=c=>({MR71578A:'MR7158A',UQ7375G:'UQ7357G'}[c]||c),norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
 for(const p of products)for(const v of p.purchaseVariants){
  const rows=source.variants.filter(r=>alias(r.code)===p.model&&norm(r.color)===norm(v.colour)&&r.size===v.size);assert(rows.length);
  const expected=r=>Math.round(r.promoValid?r.promo:Number(r.sellingPrice)>0?r.sellingPrice:r.mrp);assert.equal(v.price,expected(rows[0]));assert.equal(v.mrp,rows[0].mrp);
  if(v.available)assert(rows.every(r=>r.stockKnown&&r.inStock&&expected(r)===v.price&&r.mrp===v.mrp));
 }
 console.log('Every published size/colour price reconciled to the stock sheets: Promo → Selling Price → MRP.');
}
console.log(`2XU verified: ${products.length} models, ${variants} selections, ${available} purchasable selections; photos, SEO, feed, search and tamper-resistant checkout.`);
