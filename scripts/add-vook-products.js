const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const stock={S:['Black','Blue','Pink'],M:['Black','Blue','Pink'],L:['Black','Blue','Pink']};
const models=[false,true].map(pro=>({
id:pro?88002:88001,name:pro?'VOOK V8E Pro Carbon Road Bike':'VOOK V8E Carbon Road Bike',
brand:'VOOK',mainCategory:'vook',categoryPage:'bikes-frames.html',categoryLabel:'Bikes & Frames',
price:pro?180000:155000,mrp:pro?180000:155000,available:true,
image:'assets/products/vook-v8e/bike.png',images:['assets/products/vook-v8e/bike.png'],
sizes:['S','M','L'],sizeAvailability:{S:true,M:true,L:true},secondaryLabel:'Select Colour',
secondaryOptions:['Black','Blue','Pink'],optionsBySize:stock,
description:pro?'VOOK V8E carbon road bike with L-TWOO eGR 13-speed electronic shifting and the Cyclify Velove Glide 50 mm carbon wheel upgrade.':'VOOK V8E carbon road bike with L-TWOO eGR 13-speed electronic shifting, hydraulic disc brakes and WE ONE aluminium wheels.',
specs:[`Model: ${pro?'VOOK V8E Pro — Cyclify Velove wheel build':'VOOK V8E'}`,'Frame: Carbon road frameset, internal routing, flat-mount disc brakes, rear 12 × 142 mm thru-axle','Fork: T700 carbon, front 12 × 100 mm thru-axle',
`Wheelset: ${pro?'Velove Glide 50 mm carbon rims, ratchet hubs, 1,445 g':'WE ONE 25 mm aluminium rims, ratchet hubs, 1,680 g'}`,
'Shifting: L-TWOO eGR wireless electronic 1 × 13 speed','Crankset: WE ONE 7075 aluminium 48T chainring with EVS crank','Crank arm length: S 165 mm; M/L 170 mm','Cassette: EVS 13-speed 11–45T','Chain: YBN 13-speed Black Diamond','Brakes: L-TWOO eGR hydraulic disc brakes, front/rear 160 mm rotors','Tyres: VEPOSS 700 × 28C','Handlebar: WE ONE MAX integrated carbon cockpit; S 370 × 90 mm, M 370 × 100 mm, L 390 × 110 mm','Seatpost: Carbon, 12 mm setback','Saddle: WE ONE EVO carbon rails, 145 mm','Available sizes: S (49 cm), M (51 cm), L (53 cm)','Available colours: Black, Blue, Pink','Maximum total weight: 110 kg including bicycle, rider and cargo','Use: Paved road cycling']
}));
const colourFile=path.join(root,'assets/products/vook-v8e/colour-photos.json');
if(fs.existsSync(colourFile)){
const photos=JSON.parse(fs.readFileSync(colourFile,'utf8'));
const v8e=models.find(model=>model.id===88001);
v8e.image=photos.find(photo=>photo.colour==='Black').localPath;
v8e.images=photos.map(photo=>photo.localPath);
v8e.imageByColour=Object.fromEntries(photos.filter(photo=>['Black','Blue','Pink'].includes(photo.colour)).map(photo=>[photo.colour,photo.localPath]));
}
for(const file of ['product.html','bikes-frames.html']){
const target=path.join(root,file);let html=fs.readFileSync(target,'utf8');
const match=html.match(/const\s+products\s*=\s*(\[[\s\S]*?\]);/);if(!match)throw Error('Product array missing '+file);
const items=vm.runInNewContext('('+match[1]+')');
for(const model of models){const at=items.findIndex(item=>item.id===model.id);if(at<0)items.push(model);else items[at]=model;}
html=html.replace(match[0],'const products='+JSON.stringify(items,null,4)+';');
if(file==='bikes-frames.html'){
if(!html.includes('{key:"vook"'))html=html.replace('{key:"tavelo",','{key:"vook",label:"VOOK",image:"assets/products/vook-v8e/bike.png"},\n{key:"tavelo",');
html=html.replace(/Road Bikes &amp; Carbon Frames India \| SAVA, (?:VOOK, )?TAVELO \| Cyclify/g,'Road Bikes &amp; Carbon Frames India | VOOK, SAVA | Cyclify');
html=html.replaceAll('Shop SAVA and ELVES road bikes, configure a TAVELO Arow, or explore TFSA carbon frames. Compare prices, frame sizes and specifications at Cyclify India.','Shop SAVA, VOOK and ELVES carbon road bikes, configure a TAVELO Arow, or explore TFSA frames. Compare prices, sizes and specifications at Cyclify India.');
}
fs.writeFileSync(target,html);
}
const allowPath=path.join(root,'assets/data/product-allowlist.json');const allow=JSON.parse(fs.readFileSync(allowPath));for(const model of models)if(!allow.productIds.includes(String(model.id)))allow.productIds.push(String(model.id));fs.writeFileSync(allowPath,JSON.stringify(allow,null,2)+'\n');
console.log('Added VOOK V8E and V8E Pro; S/M/L, Black/Blue/Pink, in stock.');
