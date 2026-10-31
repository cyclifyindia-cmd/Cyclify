'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const overrides=JSON.parse(fs.readFileSync(path.join(root,'assets/data/polygon-image-overrides.json'),'utf8'));
const target=path.join(root,'assets/data/distributor-products-3.json');
const data=JSON.parse(fs.readFileSync(target,'utf8'));
let changed=0;
for(const p of data.products){
 const match=overrides.products.find(x=>String(x.id)===String(p.id));
 if(!match)continue;
 if(p.brand!=='Polygon'||p.name!==match.name)throw Error('Polygon photo identity changed: '+p.id);
 for(const image of match.images){const absolute=path.resolve(root,image);if(!absolute.startsWith(root+path.sep)||!fs.existsSync(absolute))throw Error('Missing Polygon image '+image);}
 const original=JSON.stringify(p);
 p.image=match.images[0];p.images=match.images;
 for(const v of p.purchaseVariants||[])v.image=p.image;
 if(p.imageByColour)for(const colour of Object.keys(p.imageByColour))p.imageByColour[colour]=p.image;
 if(original!==JSON.stringify(p))changed++;
}
if(changed){const text=JSON.stringify(data,null,2)+'\n';const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd);}}
console.log('Verified Polygon photos applied to '+changed+' records.');
