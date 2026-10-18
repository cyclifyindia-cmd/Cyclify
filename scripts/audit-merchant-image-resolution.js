'use strict';
const fs=require('node:fs'),path=require('node:path'),cheerio=require('cheerio'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');

async function main(){
  const feed=cheerio.load(fs.readFileSync(path.join(root,'google-merchant-feed.xml'),'utf8'),{xmlMode:true});
  const localImages=new Map();
  feed('item').each((_,element)=>{
    const item=feed(element),url=item.find('g\\:image_link').text().trim();
    if(!url.startsWith('https://cyclify.in/'))return;
    const productId=item.find('g\\:id').text().trim();
    const file=path.join(root,...decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '').split('/'));
    const products=localImages.get(file)||[];products.push(productId);localImages.set(file,products);
  });
  const failures=[],currentWarnings=[],upcomingWarnings=[];
  for(const [file,products] of localImages){
    if(!fs.existsSync(file)){failures.push(products.join(', ')+': missing '+path.relative(root,file));continue;}
    const metadata=await sharp(file).metadata(),width=metadata.width||0,height=metadata.height||0;
    if(width*height>64000000)failures.push(products.join(', ')+`: Merchant image exceeds 64 megapixels (${width}x${height})`);
    if(width<100||height<100)currentWarnings.push({products,width,height,file:path.relative(root,file)});
    if(width<500||height<500)upcomingWarnings.push({products,width,height,file:path.relative(root,file)});
  }
  console.log(`Merchant image resolution: ${localImages.size} local primary images checked; ${failures.length} file failures; ${currentWarnings.length} below 100x100; ${upcomingWarnings.length} below Google's announced 500x500 minimum for 31 January 2027.`);
  if(currentWarnings.length)console.log(currentWarnings.slice(0,40).map(item=>`  Current-size warning ${item.products.join(', ')}: ${item.width}x${item.height} ${item.file}`).join('\n'));
  if(upcomingWarnings.length)console.log(upcomingWarnings.slice(0,40).map(item=>`  ${item.products.join(', ')}: ${item.width}x${item.height} ${item.file}`).join('\n'));
  if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
