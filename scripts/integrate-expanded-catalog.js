const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const payload = JSON.parse(fs.readFileSync(path.join(root,'assets/data/expanded-products.json'),'utf8'));
const products = payload.products;
if (products.length !== 165) throw new Error('Expected all 165 matched models before integration.');
const pages = ['bikes-frames.html','wearables.html','components.html','accessories.html','wheels-tyres.html','electronics.html'];
const stockExpression = 'cyclifyStockLabel(product)';
for (const file of pages) {
  const pathname = path.join(root,file);
  let source = fs.readFileSync(pathname,'utf8');
  const hook = `window.cyclifyMergeExpandedProducts(products,${JSON.stringify(file)});`;
  if (!source.includes(hook)) source = source.replace(`window.cyclifyMergeCadenceProducts(products,${JSON.stringify(file)});`, `$&\n${hook}`);
  if (!source.includes('/* expanded inventory options */')) source=source.replace('function addToCart(event,id){','function addToCart(event,id){\n/* expanded inventory options */\nif(products.some(item=>Number(item.id)===Number(id)&&item.inventoryGroup==="expanded")){event.stopPropagation();window.location.href=cyclifyProductUrl(id);return;}');
  source = source.replaceAll('product.available===false?"Out of stock":"Free Shipping"',`product.available===false?${stockExpression}:"Free Shipping"`);
  source = source.replaceAll('product.available===false?"Out of stock":"Add to cart"',`product.available===false?${stockExpression}:"Add to cart"`);
  const categories = [];
  const hasKey = key => new RegExp('(?:key|"key")\\s*:\\s*"'+key+'"').test(source);
  const add = (key,label,image) => { if (!hasKey(key)) categories.push({key,label,image}); };
  const first = key => products.find(product=>product.categoryPage===file && product.mainCategory===key)?.image?.replace('/expanded/','/expanded/thumbs/');
  if (file === 'bikes-frames.html') {
    for (const brand of ['Colnago','Basso','Cinelli','Pardus','Gusto','Felt','Orbea','Element']) {
      const key=brand.toLowerCase(); add(key,brand.toUpperCase(),first(key));
    }
    source=source.replace('return product.available===false?"Out of stock":"Add to cart";',`return product.available===false?${stockExpression}:"Add to cart";`);
  }
  if (file === 'wearables.html') {
    add('swim-triathlon','Swim & Triathlon',first('swim-triathlon'));
    add('headwear','Headwear',first('headwear'));
  }
  if (file === 'components.html') {
    for (const [key,label] of [['saddles','Saddles'],['bottom-brackets','Bottom Brackets'],['bearings','Bearings'],['brakes','Brake Parts']]) add(key,label,first(key));
    if (!hasKey('stems')) source=source.replace('const wheelSubCategories=[','const wheelSubCategories=[\n'+JSON.stringify({key:'stems',parent:'cockpit',label:'Stems',image:products.find(p=>/Cougar.*Stem/i.test(p.name))?.image?.replace('/expanded/','/expanded/thumbs/')})+',');
  }
  if (categories.some(category=>!category.image)) throw new Error('Missing category photo for '+file);
  if (categories.length) source=source.replace('const categories=[','const categories=[\n'+categories.map(category=>JSON.stringify(category)).join(',\n')+',');
  fs.writeFileSync(pathname,source,'utf8');
}
const allowlistPath=path.join(root,'assets/data/product-allowlist.json');
const allowlist=JSON.parse(fs.readFileSync(allowlistPath,'utf8'));
allowlist.productIds=[...new Set([...allowlist.productIds.map(String),...products.map(product=>String(product.id))])].sort((a,b)=>Number(a)-Number(b));
fs.writeFileSync(allowlistPath,JSON.stringify(allowlist,null,2)+'\n','utf8');
console.log('Integrated 165 matched models, category navigation and Coming Soon labels.');
