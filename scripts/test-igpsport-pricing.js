'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),cheerio=require('cheerio');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {isIgpsportSource,applyIgpsportPricing}=require('./igpsport-pricing');
const synthetic={id:1,stockSource:'cycletime',name:'iGPSPORT test',supplierPrice:249,variants:[{id:1,supplierPrice:249}]};
assert.equal(applyIgpsportPricing([synthetic])[0].price,149);assert.equal(synthetic.variants[0].price,149);applyIgpsportPricing([synthetic]);assert.equal(synthetic.price,149,'Rule must not subtract twice');
assert.throws(()=>applyIgpsportPricing([{...synthetic,supplierPrice:100}]),/safely/);
const products=JSON.parse(read('assets/data/cycletime-products.json')).products.filter(isIgpsportSource);
const allowed=new Set(JSON.parse(read('assets/data/product-allowlist.json')).productIds.map(String));
const trusted=JSON.parse(read('marketplace-backend/payment-function/functions/catalog.json')).products;
const routesContext={window:{}};vm.runInNewContext(read('assets/js/product-routes.js'),routesContext);
const feed=cheerio.load(read('google-merchant-feed.xml'),{xml:true});
async function main(){for(const p of products){assert.equal(p.pricingPolicy,'cycletime-minus-100',p.name);assert.equal(p.price,p.supplierPrice-100,p.name);for(const v of p.variants)assert.equal(v.price,v.supplierPrice-100,p.name+' variant');if(!allowed.has(String(p.id)))continue;
assert.equal(trusted[p.id].price,p.price,p.name+' secure checkout');const html=read(routesContext.window.CYCLIFY_PRODUCT_ROUTES[p.id]),$=cheerio.load(html);const schema=JSON.parse($('#cyclify-product-schema').text())['@graph'].find(p=>p['@type']==='Product');assert.equal(Number(schema.offers.price),p.price,p.name+' schema');
const item=feed('item').filter((_,e)=>feed(e).find('g\\:id').text()==='CYCLIFY-'+p.id);assert.equal(item.find('g\\:sale_price').text()||item.find('g\\:price').text(),p.price.toFixed(2)+' INR',p.name+' feed');
const code=html.match(/async function syncProductStock\(\)\{[\s\S]*?\n\}\n\s*const sizeSection/)[0].replace(/\n\s*const sizeSection$/,'');
for(const badPrice of [p.supplierPrice*100,p.supplierPrice]){const product=JSON.parse(JSON.stringify(p)),mrp=product.mrp;const context={product,fetchSourceProduct:async()=>({variants:[{price:badPrice,compare_at_price:9999999,available:false}]}),getVariantSize:()=>'',applySizeAvailability:()=>{},updateCartButtonForSize:()=>{},setProductSeo:()=>{},updateProductPriceDisplay:()=>{}};vm.runInNewContext(code,context);await context.syncProductStock();assert.equal(product.price,p.price,p.name+' runtime price stability');assert.equal(product.mrp,mrp,p.name+' runtime MRP stability');assert.equal(product.available,false,'Stock check must still work');}
}
const cart=read('cart.html'),block=cart.match(/\/\* CYCLIFY_IGPSPORT_CART_PRICES_START \*\/[\s\S]*?\/\* CYCLIFY_IGPSPORT_CART_PRICES_END \*\//)[0],func=cart.match(/function normalizeKnownCartPrices\(items\)\{[\s\S]*?\n\}\n\s*let cart=/)[0].replace(/\n\s*let cart=$/,'');const ctx={window:{},localStorage:{setItem:()=>{}}};vm.runInNewContext(block+'\n'+func,ctx);for(const id of ['11048872345793','10785802158273','47','38']){const items=[{id,price:999999,quantity:2,size:'Default Title'}];ctx.normalizeKnownCartPrices(items);assert.equal(items[0].price,trusted[id].price,'Repair previously inflated cart '+id);assert.equal(items[0].quantity,2);}
console.log('iGPSPORT verified: '+products.length+' source listings; ₹100 discount applied once; runtime cannot overwrite price/MRP; stock refresh retained; cart, schema, feed and secure checkout match.');}
main().catch(e=>{console.error(e);process.exitCode=1;});
