'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),cheerio=require('cheerio');
const tf=require('@tensorflow/tfjs'),wasm=require('@tensorflow/tfjs-backend-wasm'),mobilenet=require('@tensorflow-models/mobilenet'),sharp=require('sharp');
const features=require('../assets/js/photo-features');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/vision'),modelDir=path.join(out,'mobilenet-v2-050');
const modelSource='https://tfhub.dev/google/imagenet/mobilenet_v2_050_224/classification/2/';
function write(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file)&&Buffer.compare(fs.readFileSync(file),Buffer.from(data))===0)return;fs.writeFileSync(file,data);}
async function download(url){const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error('Download failed '+r.status);return Buffer.from(await r.arrayBuffer());}
async function prepare(){
 fs.mkdirSync(modelDir,{recursive:true});const modelPath=path.join(modelDir,'model.json');
 if(!fs.existsSync(modelPath))write(modelPath,await download(modelSource+'model.json?tfjs-format=file'));
 const json=JSON.parse(fs.readFileSync(modelPath));for(const group of json.weightsManifest)for(const file of group.paths)if(!fs.existsSync(path.join(modelDir,file)))write(path.join(modelDir,file),await download(modelSource+file+'?tfjs-format=file'));
 const copies=[['@tensorflow/tfjs/dist/tf.min.js','tf-4.22.0.min.js'],['@tensorflow-models/mobilenet/dist/mobilenet.min.js','mobilenet-2.1.1.min.js']];
 for(const [src,dest] of copies)write(path.join(out,dest),fs.readFileSync(require.resolve(src)));
 for(const name of ['tf-backend-wasm.min.js','tfjs-backend-wasm.wasm','tfjs-backend-wasm-simd.wasm'])write(path.join(out,name),fs.readFileSync(path.join(root,'node_modules/@tensorflow/tfjs-backend-wasm/dist',name)));
 for(const [repo,name] of [['tfjs','tensorflow-LICENSE'],['tfjs-models','mobilenet-LICENSE']])if(!fs.existsSync(path.join(out,name)))write(path.join(out,name),await download('https://raw.githubusercontent.com/tensorflow/'+repo+'/master/LICENSE'));
}
async function loadModel(){
 wasm.setWasmPaths(path.join(root,'node_modules/@tensorflow/tfjs-backend-wasm/dist')+path.sep);wasm.setThreadsCount(1);await tf.setBackend('wasm');await tf.ready();
 const json=JSON.parse(fs.readFileSync(path.join(modelDir,'model.json'))),weights=Buffer.concat(json.weightsManifest.flatMap(g=>g.paths.map(p=>fs.readFileSync(path.join(modelDir,p)))));
 return mobilenet.load({version:2,alpha:.5,inputRange:[0,1],modelUrl:tf.io.fromMemory({modelTopology:json.modelTopology,weightSpecs:json.weightsManifest.flatMap(g=>g.weights),weightData:weights.buffer.slice(weights.byteOffset,weights.byteOffset+weights.byteLength)})});
}
async function pixels(bytes,crop=true){
 const {data,info}=await sharp(bytes,{limitInputPixels:40000000}).rotate().resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const rect=crop?(crop==='flat'?features.flatBounds:features.bounds)(data,info.width,info.height):{x:0,y:0,width:info.width,height:info.height};
 return sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:rect.x,top:rect.y,width:rect.width,height:rect.height}).flatten({background:'#fff'}).resize(224,224,{fit:'contain',background:'#fff'}).removeAlpha().raw().toBuffer();
}
async function embed(model,bytes,crop=true){const data=await pixels(bytes,crop),input=tf.tensor3d(new Uint8Array(data),[224,224,3],'int32'),output=model.infer(input,true);const values=features.normalise(await output.data());input.dispose();output.dispose();return values;}
function products(){const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/search-index.js'),'utf8'),ctx);return ctx.window.CYCLIFY_SEARCH_PRODUCTS;}
function imageSources(p){
 const images=[p.image];const page=path.join(root,p.url);if(fs.existsSync(page)){const $=cheerio.load(fs.readFileSync(page,'utf8'));$('script[type="application/ld+json"]').each((_,el)=>{try{const j=JSON.parse($(el).text()),items=[j,...(j['@graph']||[])];for(const item of items)if(item['@type']==='Product')for(const image of [].concat(item.image||[]))images.push(typeof image==='string'?image:image?.url);}catch(_){}});}
 return [...new Set(images.filter(Boolean).map(src=>src.replace(/^https:\/\/cyclify\.in\//,'')))].slice(0,8);
}
async function imageBytes(src){if(/^https?:/.test(src))return download(src);const absolute=path.resolve(root,src);if(!absolute.startsWith(root+path.sep))throw new Error('Invalid image path');return fs.readFileSync(absolute);}
async function build(){
 await prepare();const model=await loadModel(),list=products(),indexPath=path.join(out,'catalogue.json');let previous={};if(fs.existsSync(indexPath)){const old=JSON.parse(fs.readFileSync(indexPath));if(old.version===features.version)previous=Object.fromEntries(old.entries.map(e=>[e.id+'|'+e.image,e]));}
 const entries=[];let completed=0;for(const p of list){let count=0;for(const src of imageSources(p)){
  try{const cached=previous[p.id+'|'+src],isPrimary=src===p.image.replace(/^https:\/\/cyclify\.in\//,'');if(/^https?:/.test(src)&&cached?.primary===p.image&&!process.argv.includes('--refresh')){entries.push(cached);count++;continue;}const bytes=await imageBytes(src),hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);let entry;if(cached?.hash===hash&&cached.primary===p.image)entry=cached;else{const values=await embed(model,bytes);entry={id:p.id,image:src,primary:p.image,hash,vector:Buffer.from(features.quantise(values)).toString('base64')};}if(isPrimary&&!entry.fingerprint)entry={...entry,fingerprint:Buffer.from(features.packFingerprint(features.fingerprint(await pixels(bytes)))).toString('base64')};entries.push(entry);count++;}catch(e){console.warn('Skipped photo',p.id,src,e.message);}
 }if(!count)throw new Error('No indexed photo for '+p.id);if(++completed%20===0)console.log('Indexed '+completed+'/'+list.length+' products ('+entries.length+' photos)');}
 write(indexPath,JSON.stringify({version:features.version,model:'MobileNetV2 0.50',dimensions:1280,products:list.length,entries})+'\n');console.log('Photo search: '+list.length+' products / '+entries.length+' photos; all catalogue products covered.');model.model.dispose();
}
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={prepare,loadModel,embed,pixels,imageBytes,imageSources,products};
