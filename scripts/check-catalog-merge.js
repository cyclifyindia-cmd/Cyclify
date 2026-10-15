// Read-only guard: distinguish regenerated cache hashes/formatting from real
// incoming catalogue changes before resolving an automatic-sync overlap.
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:20*1024*1024});
const base=git('merge-base','HEAD','origin/main').trim();
const incoming=git('diff','--name-only',base,'origin/main').trim().split('\n').filter(Boolean);
for(const file of incoming){
  const before=git('show',base+':'+file);
  const after=git('show','origin/main:'+file);
  if(file==='assets/data/seo-lastmod.json'){
    const clean=source=>Object.fromEntries(Object.entries(JSON.parse(source)).map(([key,value])=>[key,{lastmod:value.lastmod}]));
    assert.deepEqual(clean(after),clean(before),'Incoming lastmod content changed: '+file);
  }else if(file==='marketplace-backend/payment-function/functions/catalog.json'){
    const clean=source=>{const value=JSON.parse(source);delete value.generatedAt;return value;};
    assert.deepEqual(clean(after),clean(before),'Incoming checkout stock or price changed: '+file);
  }else{
    const normalize=source=>source.replace(/\?v=[a-f0-9]+/g,'?v=CACHE').replace(/(Rs|₹)\s*([\d,]+)/g,(_,currency,amount)=>currency+amount.replace(/,/g,'')).replace(/\s+/g,'');
    assert(normalize(after)===normalize(before),'Incoming substantive change: '+file);
  }
}
console.log(`Verified all ${incoming.length} incoming files: only generated cache hashes, generation timestamps, currency comma formatting and whitespace changed. No incoming stock, numeric prices, product records or page content changed.`);
