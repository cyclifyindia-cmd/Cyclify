'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),cheerio=require('cheerio'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const engine=require('../assets/js/search-engine');
const context={window:{}};vm.runInNewContext(read('assets/js/search-index.js'),context);
const products=context.window.CYCLIFY_SEARCH_PRODUCTS,index=engine.createIndex(products);
const feed=cheerio.load(read('google-merchant-feed.xml'),{xmlMode:true});
const feedRecords=new Map();
feed('item').each((_,item)=>{const el=feed(item),get=name=>el.children().filter((_,n)=>n.name===name).text();feedRecords.set(get('g:id').replace('CYCLIFY-',''),{url:get('link'),price:parseFloat(get('g:sale_price')||get('g:price'))});});
assert.equal(products.length,feedRecords.size+1,'The search index must contain every listed product and the Tavelo build');
assert.equal(index.entries.length,products.length,'No duplicate product IDs');
const trusted=JSON.parse(read('marketplace-backend/payment-function/functions/catalog.json')).products;
let comingSoon=0,out=0;
for(const p of products){
 assert(p.url&&fs.existsSync(path.join(root,p.url)),'Missing destination '+p.id);
 const match=engine.search(index,p.name);
 assert(match.items.some(item=>String(item.id)===String(p.id)),'Full name is not findable: '+p.name);
 const compact=engine.search(index,engine.normalise(p.name).replace(/ /g,''));
 assert(compact.items.some(item=>String(item.id)===String(p.id)),'Compact name is not findable: '+p.name);
 if(Number(p.id)!==990001){
  const record=feedRecords.get(String(p.id));assert(record,'Unlisted product leaked into search: '+p.id);
  assert.equal('https://cyclify.in/'+p.url,record.url,'Canonical destination '+p.id);
  assert.equal(Number(p.price),record.price,'Displayed price '+p.id);
  assert.equal(p.available,trusted[String(p.id)].available!==false,'Stock mismatch '+p.id);
  assert.equal(p.stockStatus,trusted[String(p.id)].stockStatus||'','Stock status '+p.id);
 }
 if(p.stockStatus==='coming-soon')comingSoon++;
 else if(p.available===false)out++;
}
for(const query of ['X2Max','think rider x2 max','X2 Max ThinkRider','thinkrider x2max'])assert(engine.search(index,query).items.some(p=>Number(p.id)===36),query);
for(const [query,id] of [['Sava A7L',63],['Vook V8E Pro',88002],['Tavelo Arow',990001],['FLR PR350',64],['igpsport igs800',46]])assert(engine.search(index,query).items.some(p=>Number(p.id)===id),query);
const typo=engine.search(index,'basso venat');assert.equal(typo.correctedQuery,'basso venta');assert(typo.items.some(p=>Number(p.id)===900023));
assert(engine.search(index,'wheels').total>12,'Broad searches must not stop at the first result page');
assert.equal(engine.search(index,'unlisted nonsense zzyyqq').total,0);
const footerVersion=crypto.createHash('sha256').update(read('assets/js/site-footer.js').replace(/\r\n/g,'\n')).digest('hex').slice(0,10);
let pages=0;
for(const file of cp.execFileSync('git',['ls-files','*.html'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)){
 const source=read(file),$=cheerio.load(source);
 if(!$('#searchInput,[data-global-search]').length)continue;
 assert(source.includes('site-footer.js?v='+footerVersion),'Search loader not updated on '+file);pages++;
}
console.log('Search verified: '+products.length+' products by full and compact names; '+comingSoon+' Coming Soon and '+out+' out-of-stock products retained; canonical URLs/prices/stock, model aliases, typo correction, uncapped results and '+pages+' search headers passed.');
