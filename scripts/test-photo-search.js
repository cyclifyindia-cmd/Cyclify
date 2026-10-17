'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),features=require('../assets/js/photo-features'),build=require('./build-photo-search');
const root=path.resolve(__dirname,'..'),catalogue=JSON.parse(fs.readFileSync(path.join(root,'assets/vision/catalogue.json'))),products=build.products();
assert.equal(catalogue.version,features.version);assert.equal(catalogue.dimensions,1280);
const entries=catalogue.entries.map(e=>({...e,values:features.normalise(Buffer.from(e.vector,'base64')),fingerprintValues:e.fingerprint?features.unpackFingerprint(Buffer.from(e.fingerprint,'base64')):null}));
for(const p of products){const photos=entries.filter(e=>String(e.id)===String(p.id)&&e.primary===p.image);assert(photos.length,'Photo index missing or outdated: '+p.id);for(const photo of photos)assert.equal(photo.values.length,1280,'Invalid photo vector: '+p.id);}
assert.equal(features.rank([new Float32Array(1280)],entries,products).length,0,'Blank features must not force results');
assert.equal(features.rank([entries[0].values],[{...entries[0],primary:'outdated.jpg'}],products).length,0,'Stale product images must not be matched');
console.log('Visual index verified: '+products.length+' products / '+entries.length+' product photos; model dimensions, current primary photos, stale-image guard and no-match guard passed.');
async function visual(){
 const sharp=require('sharp'),model=await build.loadModel();
 const selected=[36,63,88001,88003,46,900104,64,900117,900103,900128,900184,900187].map(id=>products.find(p=>Number(p.id)===id)).filter(Boolean);let passed=0;
 for(const p of selected){const original=await build.imageBytes(p.image),transformed=await sharp(original).rotate().resize(360,260,{fit:'contain',background:'#e8e3de'}).jpeg({quality:58}).toBuffer();if(process.argv.includes('--fixtures')){const dir=path.join(root,'.preview-tools/photo-search-tests');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,p.id+'.jpg'),transformed);}const vectors=[];for(const crop of [true,'flat',false])vectors.push({values:await build.embed(model,transformed,crop),fingerprint:features.fingerprint(await build.pixels(transformed,crop))});const matches=features.rank(vectors,entries,products),rank=matches.findIndex(m=>String(m.id)===String(p.id));console.log('Changed-background JPEG:',p.id,p.name,'rank',rank+1,'top',matches[0]?.name,'score',matches[0]?.visualScore.toFixed(3));if(rank>=0&&rank<5)passed++;}
 model.model.dispose();assert(passed>=Math.ceil(selected.length*.9),'Visual regression: fewer than 90% of transformed samples were in the top five');console.log('Transformed-image recognition: '+passed+'/'+selected.length+' correct products in top five.');
}
if(process.argv.includes('--visual'))visual().catch(e=>{console.error(e);process.exitCode=1;});
