'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const hash=file=>crypto.createHash('sha256').update(read(file).replace(/\r\n/g,'\n')).digest('hex').slice(0,10);
function write(file,value){
 const dest=path.join(root,file);if(fs.readFileSync(dest,'utf8')===value)return;
 for(let attempt=0;attempt<8;attempt++){
  try{const fd=fs.openSync(dest,'r+');try{fs.writeFileSync(fd,value);fs.ftruncateSync(fd,Buffer.byteLength(value));}finally{fs.closeSync(fd);}return;}
  catch(error){if(!['UNKNOWN','EBUSY','EPERM','EACCES'].includes(error.code)||attempt===7)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,70*(attempt+1));}
 }
}
function refreshSearchLoader(){
 const footer='assets/js/site-footer.js';
 const urls={css:'/assets/css/search.css?v='+hash('assets/css/search.css'),engine:'/assets/js/search-engine.js?v='+hash('assets/js/search-engine.js'),ui:'/assets/js/search.js?v='+hash('assets/js/search.js'),catalog:'/assets/js/search-index.js?v='+hash('assets/js/search-index.js'),photoModule:'/assets/js/photo-search.js?v='+hash('assets/js/photo-search.js'),photoFeatures:'/assets/js/photo-features.js?v='+hash('assets/js/photo-features.js'),photoIndex:'/assets/vision/catalogue.json?v='+hash('assets/vision/catalogue.json')};
 const loader=`/* CYCLIFY_SEARCH_LOADER_START */\n(function(){\n if(!document.querySelector('#searchInput,[data-global-search]')||document.querySelector('script[data-cyclify-search-ui]'))return;\n const urls=${JSON.stringify(urls)};\n const css=document.createElement('link');css.rel='stylesheet';css.href=urls.css;document.head.appendChild(css);\n const engine=document.createElement('script');engine.src=urls.engine;engine.onload=function(){const ui=document.createElement('script');ui.src=urls.ui;ui.dataset.cyclifySearchUi='true';ui.dataset.catalogSrc=urls.catalog;ui.dataset.photoModuleSrc=urls.photoModule;ui.dataset.photoFeaturesSrc=urls.photoFeatures;ui.dataset.photoIndexSrc=urls.photoIndex;document.head.appendChild(ui);};document.head.appendChild(engine);\n})();\n/* CYCLIFY_SEARCH_LOADER_END */\n`;
 const previous=read(footer),body=previous.replace(/\/\* CYCLIFY_SEARCH_LOADER_START \*\/[\s\S]*?\/\* CYCLIFY_SEARCH_LOADER_END \*\/\r?\n?/,'');
 write(footer,loader+body);
 return hash(footer);
}
function updatePageVersions(version){
 const files=cp.execFileSync('git',['ls-files','*.html'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/);
 let changed=0;
 for(const file of files){if(!fs.existsSync(path.join(root,file)))continue;const s=read(file),n=s.replace(/assets\/js\/site-footer\.js(?:\?v=[^"\s<]+)?/g,'assets/js/site-footer.js?v='+version);if(s!==n){write(file,n);changed++;}}
 return changed;
}
function rebuildExistingSearch(){
 const context={window:{}};vm.runInNewContext(read('assets/js/search-index.js'),context);vm.runInNewContext(read('assets/js/product-routes.js'),context);
 const catalogue=JSON.parse(read('marketplace-backend/payment-function/functions/catalog.json')).products;
 const records=context.window.CYCLIFY_SEARCH_PRODUCTS.map(p=>{
  const trusted=catalogue[String(p.id)];
  const url=Number(p.id)===990001?'tavelo-arow.html':context.window.CYCLIFY_PRODUCT_ROUTES[String(p.id)];
  if(!url||!fs.existsSync(path.join(root,url)))throw new Error('Missing canonical search destination for '+p.id);
  return {
   ...p,
   url,
   available:trusted?trusted.available!==false:p.available!==false,
   stockStatus:trusted?(trusted.stockStatus||''):(p.stockStatus||''),
   brand:p.brand||String(p.name).split(' ')[0]
  };
 });
 write('assets/js/search-index.js','window.CYCLIFY_SEARCH_PRODUCTS='+JSON.stringify(records)+';\n');
 const version=refreshSearchLoader(),pages=updatePageVersions(version);
 console.log('Search: '+records.length+' products, '+pages+' shared header pages updated; '+records.filter(p=>p.available===false).length+' unavailable products retained.');
}
if(require.main===module)rebuildExistingSearch();
module.exports={refreshSearchLoader,updatePageVersions};
