const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const base='https://www.dogoodco.in/products/vook-v8e-ltwoo-egr-1-13-speed-electronic-groupset';
async function main(){
const rows=await Promise.all([['Black','-black'],['Blue','-blue'],['Pink','-pink'],['Reference','']].map(async([colour,suffix])=>{
const page=base+suffix;
const response=await fetch(page+'.js');if(!response.ok)throw Error(colour+' product response '+response.status);
const product=await response.json();
const first=product.images?.[0];if(!first)throw Error('Missing first image: '+colour);
const source=new URL(first,'https://www.dogoodco.in').href;
const image=await fetch(source);if(!image.ok)throw Error('Image response '+image.status);
const extension=path.extname(new URL(source).pathname)||'.jpg';
const localPath=`assets/products/vook-v8e/${colour.toLowerCase()}-first${extension}`;
await fs.writeFile(path.join(root,localPath),Buffer.from(await image.arrayBuffer()));
return {colour,title:product.title,page,source,localPath};
}));
await fs.writeFile(path.join(root,'assets/products/vook-v8e/colour-photos.json'),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
