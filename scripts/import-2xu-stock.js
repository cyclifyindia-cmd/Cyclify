'use strict';
// Explicit stock-sheet import. Reference sellers never supply Cyclify prices or stock.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cheerio=require('cheerio'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),staging=path.join(root,'.preview-tools/2xu');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const codeFor=code=>({MR71578A:'MR7158A',UQ7375G:'UQ7357G'}[code]||code);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function save(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const value=typeof data==='string'?data:JSON.stringify(data,null,2)+'\n';if(fs.existsSync(file)){if(fs.readFileSync(file,'utf8')===value)return;const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,value);fs.ftruncateSync(fd,Buffer.byteLength(value));}finally{fs.closeSync(fd);}}else fs.writeFileSync(file,value);}
async function imageAsset(source){
 const key=hash(source).slice(0,20),relative='assets/products/2xu/'+key+'.webp',full=path.join(root,relative),thumb=path.join(root,'assets/products/2xu/thumbs',key+'.webp');
 if(fs.existsSync(full)&&fs.existsSync(thumb))return relative;
 let bytes;if(/^https:/.test(source)){const r=await fetch(source,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error('Photo HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());}else bytes=fs.readFileSync(source);
 fs.mkdirSync(path.dirname(full),{recursive:true});fs.mkdirSync(path.dirname(thumb),{recursive:true});await sharp(bytes,{limitInputPixels:50000000}).rotate().flatten({background:'#fff'}).resize({width:1400,height:1700,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toFile(full);await sharp(bytes).rotate().flatten({background:'#fff'}).resize({width:320,height:360,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(thumb);return relative;
}
function referenceFacts(reference,code){
 const $=cheerio.load(reference?.body_html||''),text=$.text(),facts=[];
 $('tr').each((_,row)=>{const cells=$(row).find('td,th').map((_,c)=>$(c).text().replace(/\s+/g,' ').trim()).get();if(cells.length===2&&/^(?:fabric|material|composition|capacity|inseam|length|construction|closure|cushion|pack|unit|fit|sleeve|pockets|weight|rim)/i.test(cells[0])&&cells.join(' ').length<210)facts.push(cells[0].replace(/:$/,'')+' : '+cells[1]);});
 $('li').each((_,li)=>{const value=$(li).text().replace(/\s+/g,' ').trim();if(value.length>8&&value.length<145&&/fabric|pocket|seam|zip|sleeve|reflective|closure|nylon|polyester|lycra|silicone|mesh|ventilat|\d.*(?:pack|pair|inch|mm)/i.test(value)&&!/pain|injur|blood|recover|medic|shipping|return|warranty|review|delivery|free|\b(?:http|www)\b/i.test(value))facts.push('Construction : '+value);});
 if(/sold in pairs/i.test(text))facts.push('Unit : Pair');
 const tables=[];$('table').each((_,table)=>{const rows=$(table).find('tr').map((_,r)=>[$(r).find('th,td').map((_,c)=>$(c).text().replace(/\s+/g,' ').trim()).get()]).get();if(rows.length>2&&rows[0].some(v=>/size/i.test(v))&&rows[0].some(v=>/chest|waist|hip|calf|height|foot|shoe|bust/i.test(v))&&rows.every(r=>r.length===rows[0].length))tables.push({headers:rows[0],rows:rows.slice(1)});});
 return {facts:[...new Set(facts)].slice(0,7),tables:tables.slice(0,1)};
}
async function run(){
 const audit=read(path.join(staging,'inventory-audit.json')),official=read(path.join(staging,'official-matches.json')),retailer=read(path.join(staging,'retailer-reference.json')).products,photos=read(path.join(staging,'sheet-photos.json'));
 const groups=new Map();for(const row of audit.variants){const code=codeFor(row.code);if(!groups.has(code))groups.set(code,[]);groups.get(code).push(row);}
 const registryFile=path.join(root,'assets/data/2xu-model-ids.json'),registry=fs.existsSync(registryFile)?read(registryFile):{};let next=Math.max(910000,...Object.values(registry))+1;
 const products=[],held=[],provenance=[];let completed=0;
 for(const [code,rows] of [...groups.entries()].sort(([a],[b])=>a.localeCompare(b))){
  if(!registry[code])registry[code]=next++;
  const officialSources=official.filter(m=>codeFor(m.code)===code).flatMap(m=>m.official),references=retailer.filter(p=>norm(p.title).includes(code.toLowerCase())||norm(p.handle).includes(code.toLowerCase()));
  const english=p=>p&&!/[^\u0000-\u024f]/.test(p.title);
  const source=officialSources.find(english)||references.find(english)||officialSources[0];
  if(!source){held.push({code,reason:'Model-specific specifications not verified'});continue;}
  const gender=/^W/.test(code)?'Women':/^M/.test(code)?'Men':'Unisex';
  let title=source.title.replace(/^2XU\s+/i,'').replace(new RegExp(code,'ig'),'').replace(/\(Noosa Edition\)/ig,'').replace(/\b(?:Men'?s|Women'?s)\b/ig,'').replace(/\s+/g,' ').trim();
  if(!english({title})||!/[a-z]{3}/i.test(title))title=rows[0].name;title=title.replace(/^(?:Women|Men)\s+/i,'').replace(/\s+/g,' ').replace(/^[\s-]+|[\s-]+$/g,'');
  const name='2XU '+(gender==='Unisex'?'':gender+"'s ")+title;
  const grouped=new Map();for(const row of rows){const k=norm(row.color)+'|'+row.size;if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(row);}
  const purchaseVariants=[],allImages=[],imageByColour={};
  for(const same of grouped.values()){
   const row=same[0],colour=row.color.replace(/\s*\/\s*/g,'/'),size=row.size;
   const sheetPhotos=photos.filter(p=>codeFor(p.code)===code&&norm(p.color)===norm(colour));
   const officialColor=officialSources.find(p=>p.variants.some(v=>[v.option1,v.option2,v.option3,v.featured_image?.alt].some(value=>norm(value)===norm(colour))));
   const referenceColor=references.map(p=>({p,v:p.variants.find(v=>[v.option1,v.option2,v.option3].some(value=>norm(value)===norm(colour)))})).find(m=>m.v?.featured_image?.src);
   let imageSources=[];
   if(sheetPhotos.length)imageSources=sheetPhotos.slice(0,2).map(p=>p.file);
   else if(officialColor){const v=officialColor.variants.find(v=>[v.option1,v.option2,v.option3,v.featured_image?.alt].some(value=>norm(value)===norm(colour)));imageSources=[v?.featured_image?.src].filter(Boolean);}
   else if(referenceColor)imageSources=[referenceColor.v.featured_image.src];
   if(!imageSources.length){held.push({code,colour,size,ean:row.ean,reason:'No verified photo for this colour'});continue;}
   let images=[];try{for(const src of [...new Set(imageSources)])images.push(await imageAsset(src));}catch(e){if(sheetPhotos.length)images=[await imageAsset(sheetPhotos[0].file)];else{held.push({code,colour,size,reason:'Product photo unavailable'});continue;}}
   allImages.push(...images);imageByColour[colour]=images[0];
   const priceFor=r=>Math.round(r.promoValid?r.promo:Number(r.sellingPrice)>0?r.sellingPrice:r.mrp);
   const prices=[...new Set(same.map(priceFor))],mrps=[...new Set(same.map(r=>r.mrp))],states=[...new Set(same.map(r=>r.stockKnown?r.inStock?'available':'out-of-stock':'contact'))];
   const price=priceFor(row),mrp=row.mrp;if(!Number.isInteger(price)||price<1||price>mrp)throw new Error('Invalid source price '+code+' '+row.row);
   const conflict=prices.length>1||mrps.length>1||states.length>1,available=!conflict&&states[0]==='available',stockStatus=conflict?'contact':states[0];
   if(conflict)held.push({code,colour,size,reason:'Conflicting sheet stock or prices; purchase disabled',sourceRows:same.map(r=>[r.sheet,r.row])});
   const key=hash(code+'|'+colour+'|'+size).slice(0,16);purchaseVariants.push({key,size,colour,build:'',price,mrp,available,stockStatus,image:images[0],gtin:row.gtinValid&&!audit.duplicateEans[row.ean]?row.ean:undefined});
   provenance.push({code,key,sourceRows:same.map(r=>[r.sheet,r.row]),sourcePrice:row.promoValid?'Promo':'MRP',price,mrp,stockStatus,ean:row.ean});
  }
  if(!purchaseVariants.length){held.push({code,reason:'No photograph-verified variants'});continue;}
  const initial=[...purchaseVariants].sort((a,b)=>Number(b.available)-Number(a.available)||a.price-b.price)[0],available=purchaseVariants.some(v=>v.available),stockStatus=available?'available':purchaseVariants.some(v=>v.stockStatus==='contact')?'contact':'out-of-stock';
  const accessories=/lace|belt|hydration|chip strap/i.test(title),categoryPage=accessories?'accessories.html':'wearables.html';
  const details=referenceFacts((source.body_html?.length>80&&/[a-z]{10}/i.test(cheerio.load(source.body_html).text()))?source:references[0]||source,code);
  const sizes=[...new Set(purchaseVariants.map(v=>v.size))],colours=[...new Set(purchaseVariants.map(v=>v.colour))];
  allImages.unshift(initial.image);
  const description=`Shop ${name} in India. Model ${code} is offered in ${colours.length===1?colours[0]:colours.length+' colours'}, with size-specific availability and Cyclify Special Promo pricing. Select your size and colour to see the current price and stock.`;
  products.push({id:registry[code],name,brand:'2XU',inventoryGroup:'expanded',inventorySource:'2xu-stock-20261012',model:code,mpn:code,gender,priceLabel:'SPECIAL PROMO',primaryLabel:'Select Size',secondaryLabel:'Select Colour',categoryPage,categoryLabel:accessories?'Accessories':'Apparel & Wearables',mainCategory:'2xu',subCategory:gender.toLowerCase(),price:initial.price,mrp:initial.mrp,available,stockStatus,image:initial.image,images:[...new Set(allImages)],imageByColour,sizes,secondaryOptions:colours,purchaseVariants,defaultVariantKey:initial.key,gtin:initial.gtin,description,keywords:`2XU ${code} ${title} ${gender} India sportswear running training triathlon`,specs:['Brand : 2XU','Model : '+code,'Category : '+title,'Fit category : '+gender,...details.facts],...(details.tables.length?{sizeGuideTables:details.tables}:{})});
  if(++completed%10===0)console.log('Prepared '+completed+' 2XU models');
 }
 save(registryFile,registry);save(path.join(root,'assets/data/2xu-products.json'),{version:1,stockAsOf:'2026-10-12',products});save(path.join(staging,'listing-audit.json'),{products:products.map(p=>({id:p.id,model:p.model,name:p.name,available:p.available,variants:p.purchaseVariants.length})),held,provenance});
 const allowPath=path.join(root,'assets/data/product-allowlist.json'),allow=read(allowPath);allow.productIds=[...new Set([...allow.productIds,...products.map(p=>String(p.id))])];save(allowPath,allow);
 console.log(JSON.stringify({models:products.length,inStock:products.filter(p=>p.available).length,variants:products.reduce((sum,p)=>sum+p.purchaseVariants.length,0),held:held.length,heldReasons:held.slice(0,12)}));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
