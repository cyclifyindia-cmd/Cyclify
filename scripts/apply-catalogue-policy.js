'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {loadCataloguePolicy,permittedByPolicy,sourceFiles,allowlistPath}=require('./product-allowlist');
const root=path.resolve(__dirname,'..'),policy=loadCataloguePolicy(),removed=[];
function save(file,value){const text=JSON.stringify(value,null,2)+'\n';if(fs.existsSync(file)){const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd);}}else fs.writeFileSync(file,text);}
for(const file of sourceFiles){const full=path.join(root,'assets/data',file);if(!fs.existsSync(full))continue;const data=JSON.parse(fs.readFileSync(full,'utf8'));const rejected=data.products.filter(p=>!permittedByPolicy(p,policy));removed.push(...rejected);data.products=data.products.filter(p=>permittedByPolicy(p,policy));if(rejected.length)save(full,data);}
const deferredPath=path.join(root,'assets/data/deferred-products.json');
if(fs.existsSync(deferredPath)){
 const deferred=JSON.parse(fs.readFileSync(deferredPath,'utf8'));
 for(const field of ['products','variants'])if(Array.isArray(deferred[field]))deferred[field]=deferred[field].filter(p=>permittedByPolicy(p,policy));
 save(deferredPath,deferred);
}
policy.removedProductIds=[...new Set([...(policy.removedProductIds||[]),...removed.map(p=>String(p.id))])].sort((a,b)=>Number(a)-Number(b));
save(path.join(root,'assets/data/catalogue-policy.json'),policy);
const allow=JSON.parse(fs.readFileSync(allowlistPath,'utf8'));allow.productIds=allow.productIds.filter(id=>!policy.removedProductIds.includes(String(id)));save(allowlistPath,allow);
const previous={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/search-index.js'),'utf8'),previous);
const live=previous.window.CYCLIFY_SEARCH_PRODUCTS,removedLive=live.filter(p=>!permittedByPolicy(p,policy));
const retained=live.filter(p=>permittedByPolicy(p,policy));
const report={removedSourceRecords:removed.length,removedLive:removedLive.map(p=>({id:p.id,name:p.name,brand:p.brand,url:p.url})),retained,byBrand:removedLive.reduce((o,p)=>(o[p.brand]=(o[p.brand]||0)+1,o),{})};
fs.mkdirSync(path.join(root,'.preview-tools'),{recursive:true});
const reportPath=path.join(root,'.preview-tools/brand-cleanup-report.json');
if(removedLive.length||!fs.existsSync(reportPath))save(reportPath,report);
console.log(JSON.stringify({removedSourceRecords:removed.length,removedLiveProducts:removedLive.length,retainedProducts:retained.length,meridaBikesAndFrames:retained.filter(p=>p.brand==='Merida').length,byBrand:report.byBrand},null,2));
