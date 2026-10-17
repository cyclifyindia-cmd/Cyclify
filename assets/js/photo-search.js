/* Visual inference runs locally. Customer photos never leave the browser. */
(function(){
 'use strict';
 const features=window.CyclifyPhotoFeatures,base='/assets/vision/';let ready=null,backendReady=false,catalogues=new Map();
 function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script'),timer=setTimeout(()=>{s.remove();reject(new Error('Image recognition is taking too long. Please check your connection and retry.'));},30000);s.src=src;s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);s.remove();reject(new Error('Could not load image recognition. Please retry.'));};document.head.appendChild(s);});}
 async function model(onProgress){
  if(!ready)ready=(async()=>{onProgress('Loading image recognition · first use may take a moment');if(!window.tf)await script(base+'tf-4.22.0.min.js');if(!tf.wasm)await script(base+'tf-backend-wasm.min.js');if(!window.mobilenet)await script(base+'mobilenet-2.1.1.min.js');if(!backendReady){try{tf.wasm.setWasmPaths(base);tf.wasm.setThreadsCount(1);tf.env().set('WASM_HAS_MULTITHREAD_SUPPORT',false);if(!await tf.setBackend('wasm'))await tf.setBackend('cpu');}catch(_){await tf.setBackend('cpu');}await tf.ready();backendReady=true;}return mobilenet.load({version:2,alpha:.5,inputRange:[0,1],modelUrl:tf.io.browserHTTPRequest(base+'mobilenet-v2-050/model.json',{requestInit:typeof AbortSignal.timeout==='function'?{signal:AbortSignal.timeout(45000)}:{}})});})().catch(e=>{ready=null;throw e;});
  return ready;
 }
 async function catalogue(url){if(!catalogues.has(url))catalogues.set(url,fetch(url,{credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error('Could not load product photos. Please retry.');return r.json();}).then(j=>{if(j.version!==features.version)throw new Error('The photo catalogue is updating. Please reload this page.');return j.entries.map(e=>({...e,values:features.normalise(Uint8Array.from(atob(e.vector),c=>c.charCodeAt(0))),fingerprintValues:e.fingerprint?features.unpackFingerprint(Uint8Array.from(atob(e.fingerprint),c=>c.charCodeAt(0))):null}));}).catch(e=>{catalogues.delete(url);throw e;}));return catalogues.get(url);}
 function decode(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);if(img.naturalWidth*img.naturalHeight>40000000){reject(new Error('Please use a photo smaller than 40 megapixels.'));return;}resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Please use a JPG, PNG or WebP photo.'));};img.src=url;});}
 function canvas(img,crop){
  const source=document.createElement('canvas'),scale=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight));source.width=Math.max(1,Math.round(img.naturalWidth*scale));source.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,source.width,source.height);
  const data=ctx.getImageData(0,0,source.width,source.height).data;let sum=0,squares=0,count=0;for(let p=0;p<data.length;p+=64){const v=(data[p]+data[p+1]+data[p+2])/3;sum+=v;squares+=v*v;count++;}if(squares/count-(sum/count)**2<25)throw new Error('No product is visible. Please choose a clear photo of one product.');
  const box=crop?(crop==='flat'?features.flatBounds:features.bounds)(data,source.width,source.height):{x:0,y:0,width:source.width,height:source.height};
  const c=document.createElement('canvas');c.width=c.height=224;const target=c.getContext('2d');target.fillStyle='#fff';target.fillRect(0,0,224,224);const ratio=Math.min(224/box.width,224/box.height),w=Math.round(box.width*ratio),h=Math.round(box.height*ratio);target.drawImage(source,box.x,box.y,box.width,box.height,Math.floor((224-w)/2),Math.floor((224-h)/2),w,h);return c;
 }
 async function search(file,products,{indexUrl,onProgress=()=>{},isCancelled=()=>false}){
  const img=await decode(file);if(isCancelled())return [];const [network,entries]=await Promise.all([model(onProgress),catalogue(indexUrl)]);if(isCancelled())return [];
  onProgress('Recognising your product…');await new Promise(requestAnimationFrame);const vectors=[];
  for(const crop of [true,'flat',false]){if(isCancelled())return [];const c=canvas(img,crop),output=network.infer(c,true);try{vectors.push({values:features.normalise(await output.data()),fingerprint:features.fingerprint(c.getContext('2d').getImageData(0,0,224,224).data,4)});}finally{output.dispose();}}
  if(isCancelled())return [];onProgress('Matching against Cyclify’s catalogue…');return features.rank(vectors,entries,products);
 }
 window.CyclifyPhotoSearch={search};
})();
