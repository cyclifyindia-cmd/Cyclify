'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cheerio=require('cheerio');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const absolute=image=>new URL(image,'https://cyclify.in/').href;

function verifyPhotoBinding(product,binding){
 assert.equal(product.model,binding.model,'Reviewed model identity changed: '+product.id);
 assert.equal(product.image,binding.image,'Wrong primary model photo: '+product.id);
 assert.deepEqual(product.images,binding.images,'Unreviewed gallery photo: '+product.id);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,binding.image))).digest('hex'),binding.sha256,'Reviewed image bytes changed: '+product.id);
 for(const variant of product.purchaseVariants||[])assert.equal(variant.image,binding.image,'Wrong selected-variant model photo: '+product.id);
}

function verifyRecommendations(code,product,products,routes){
 const tags=[];
 const make=tag=>({tagName:tag.toLowerCase(),dataset:{},children:[],append(...children){this.children.push(...children);},appendChild(child){this.children.push(child);},
  get innerHTML(){return '';},set innerHTML(value){assert(!/<\s*(?:img|picture|source|svg|style)\b|background(?:-image)?\s*:|url\s*\(/i.test(value),'Cross-model image reintroduced in recommendations');}
 });
 const related=make('div');
 vm.runInNewContext(code,{product,products,window:{CYCLIFY_PRODUCT_ROUTES:routes},cyclifyProductUrl:id=>routes[id],document:{getElementById:id=>{assert.equal(id,'relatedProducts');return related;},createElement:tag=>{tags.push(tag.toLowerCase());return make(tag);}}},{timeout:1500});
 assert(!tags.some(tag=>['img','picture','source','svg','style'].includes(tag)),'Recommendation creates another model image');
 assert.equal(related.children.length,Math.min(8,products.length-1),'Recommendations must remain crawlable links');
 for(const link of related.children){assert.equal(link.tagName,'a');assert(link.href);assert.notEqual(link.dataset.productId,String(product.id));assert.equal(link.children[0].textContent,products.find(p=>String(p.id)===link.dataset.productId).name);}
}

function auditProductImageIsolation(){
 const routesContext={window:{}};vm.runInNewContext(read('assets/js/product-routes.js'),routesContext);
 const routes=routesContext.window.CYCLIFY_PRODUCT_ROUTES;
 const products=Object.values(JSON.parse(read('marketplace-backend/payment-function/functions/catalog.json')).products);
 const overrides=JSON.parse(read('assets/data/product-image-overrides.json')).products;
 const expanded=JSON.parse(read('assets/data/expanded-products.json')).products;
 let count=0;
 for(const product of products){
  const source=read(routes[product.id]),$=cheerio.load(source);
  assert.equal($('#relatedProducts img,#relatedProducts picture,#relatedProducts svg,#relatedProducts source').length,0,'Static cross-model image: '+product.id);
  const code=source.match(/const relatedProducts=document\.getElementById\("relatedProducts"\);[\s\S]*?(?=function startPreorderInquiry)/)?.[0];
  assert(code,'Missing auditable product recommendation renderer: '+product.id);
  verifyRecommendations(code,product,products,routes);
  const schema=JSON.parse($('#cyclify-product-schema').text())['@graph'].find(s=>s['@type']==='Product');
  assert.equal($('#productImage').attr('src'),absolute(product.image),'Hero is not this checkout product photo: '+product.id);
  assert.equal(schema.image[0],absolute(product.image),'Structured primary photo mismatch: '+product.id);
  const binding=overrides[product.id];
  if(binding?.sha256){verifyPhotoBinding(expanded.find(p=>String(p.id)===String(product.id)),binding);assert.equal(product.image,binding.image);for(const image of schema.image)assert(binding.images.map(absolute).includes(image),'Other model in locked gallery');}
  count++;
 }
 // Prove that this test catches the actual regression, not just missing metadata.
 const hw=expanded.find(p=>p.id===940008),binding=overrides['940008'];
 assert.throws(()=>verifyPhotoBinding({...hw,image:overrides['940007'].image},binding),/Wrong primary model photo/);
 assert.throws(()=>verifyRecommendations('document.getElementById("relatedProducts").innerHTML="<img src=other-model.webp>";',products[0],products,routes),/Cross-model image/);
 console.log('Model-image isolation: '+count+' product pages, text-only recommendations, checkout/hero/schema identity, locked HW125/A3MAX photos and regression rejection verified.');
 return count;
}
if(require.main===module){try{auditProductImageIsolation();}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={auditProductImageIsolation,verifyPhotoBinding,verifyRecommendations};
