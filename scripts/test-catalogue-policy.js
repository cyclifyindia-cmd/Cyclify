'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {loadCataloguePolicy,loadAllowedProductIds,permittedByPolicy,sourceFiles}=require('./product-allowlist');
const root=path.resolve(__dirname,'..'),policy=loadCataloguePolicy(),allowed=loadAllowedProductIds();
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/search-index.js'),'utf8'),context);
const products=Array.from(context.window.CYCLIFY_SEARCH_PRODUCTS);
assert(products.length>0,'Retained inventory must not be empty');
const serialized=['assets/js/product-routes.js','google-merchant-feed.xml','assets/vision/catalogue.json'];
const payment=JSON.parse(fs.readFileSync(path.join(root,'marketplace-backend/payment-function/functions/catalog.json'),'utf8')).products;
const productFiles=fs.readdirSync(path.join(root,'products'));
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/product-routes.js'),'utf8'),context);
const routes=context.window.CYCLIFY_PRODUCT_ROUTES;
const feed=fs.readFileSync(path.join(root,'google-merchant-feed.xml'),'utf8');
const photos=JSON.parse(fs.readFileSync(path.join(root,'assets/vision/catalogue.json'),'utf8'));
for(const product of products){assert(allowed.has(String(product.id))||String(product.id)==='990001','Unexpected searchable product '+product.id);assert(permittedByPolicy(product),'Excluded search product '+product.name);}
for(const source of sourceFiles)for(const p of require(path.join(root,'assets/data',source)).products)assert(permittedByPolicy(p),'Excluded canonical record '+p.name);
for(const brand of policy.removedBrands){assert.equal(permittedByPolicy({id:'future-test',brand,name:brand+' Future product'}),false,'Future imports must respect removed brand '+brand);}
assert.equal(permittedByPolicy({id:'future-enlee',brand:'Royal Traders',name:'ENLEE Bar Tape'}),false);
assert.equal(permittedByPolicy({id:'future-merida',brand:'Merida',categoryPage:'accessories.html'}),false);
assert.equal(permittedByPolicy({id:'future-merida-bike',brand:'Merida',categoryPage:'bikes-frames.html'}),true);
for(const id of policy.removedProductIds){
 assert(!allowed.has(String(id)));assert(!payment[id],'Removed product still payable '+id);
 assert(!productFiles.some(f=>f.endsWith('-'+id+'.html')),'Removed canonical page remains '+id);
 assert(!feed.includes('<g:id>CYCLIFY-'+id+'</g:id>'),'Removed product in Merchant feed '+id);
 assert(!routes[id],'Removed product still routed '+id);
 assert(!photos.entries.some(p=>String(p.id)===String(id)),'Removed product in photo search '+id);
}
const overrides=require('../assets/data/polygon-image-overrides.json');
for(const p of require('../assets/data/distributor-products-3.json').products.filter(p=>p.brand==='Polygon')){
 const photo=overrides.products.find(x=>x.id===p.id);assert(photo,'Missing photo identity '+p.id);assert.equal(p.image,photo.images[0]);
 assert(p.image.startsWith('assets/products/polygon/'));assert(fs.existsSync(path.join(root,p.image)));
 assert(p.purchaseVariants.every(v=>v.image===p.image),'Colour image differs in checkout choices '+p.id);
}
for(const file of serialized){assert(fs.existsSync(path.join(root,file)),'Missing generated file '+file);}
const merida=products.filter(p=>p.brand==='Merida');assert(merida.length>0);assert(merida.every(p=>p.category==='Bikes & Frames'));
console.log('Catalogue exclusions, future-import guards, Polygon photos and Merida bike-only inventory verified: '+products.length+' products.');
