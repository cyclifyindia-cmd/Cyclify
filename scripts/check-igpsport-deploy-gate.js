'use strict';
// The scheduled storefront sync cannot deploy authenticated checkout functions by itself.
// Hold publication rather than let a new iGPSPORT price/stock snapshot diverge from checkout.
const fs=require('fs'),cp=require('child_process'),path=require('path');
const root=path.resolve(__dirname,'..');
const {isIgpsportSource}=require('./igpsport-pricing');
const ids=JSON.parse(fs.readFileSync(path.join(root,'assets/data/cycletime-products.json'),'utf8')).products.filter(isIgpsportSource).map(p=>String(p.id));
const file='marketplace-backend/payment-function/functions/catalog.json';
const before=JSON.parse(cp.execFileSync('git',['show','HEAD:'+file],{cwd:root,encoding:'utf8'})).products;
const after=JSON.parse(fs.readFileSync(path.join(root,file),'utf8')).products;
const changed=ids.filter(id=>JSON.stringify(before[id])!==JSON.stringify(after[id]));
// Other brands also need their updated primary/variant photos deployed to checkout.
const imageSnapshot=p=>p?JSON.stringify({image:p.image,imageByColour:p.imageByColour,variants:Object.fromEntries(Object.entries(p.purchaseVariants||{}).map(([key,v])=>[key,v.image]))}):null;
for(const id of Object.keys(after))if(imageSnapshot(before[id])!==imageSnapshot(after[id])&&!changed.includes(id))changed.push(id);
if(changed.length){console.error('Catalogue image/iGPSPORT publication held: deploy the matching secure checkout catalogue before publishing these IDs: '+changed.join(', '));process.exitCode=1;}else console.log('Product photos and iGPSPORT storefront match the existing checkout snapshot; scheduled publication is safe.');
