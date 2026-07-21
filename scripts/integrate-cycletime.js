const fs = require('fs');
const path = require('path');

const root = 'C:/Users/user/Documents/GitHub/Cyclify';

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, value) { fs.writeFileSync(path.join(root, file), value, 'utf8'); }

function arrayEnd(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing marker: ${marker}`);
  const start = source.indexOf('[', markerIndex);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '[') depth += 1;
    if (char === ']' && --depth === 0) return i + 1;
  }
  throw new Error(`Incomplete array: ${marker}`);
}

function replaceArray(source, marker, literal) {
  const markerIndex = source.indexOf(marker);
  const start = source.indexOf('[', markerIndex);
  const end = arrayEnd(source, marker);
  return source.slice(0, start) + literal + source.slice(end);
}

function addCatalogScript(source) {
  source = source.replaceAll('assets/js/cycletime-catalog.js', 'assets/js/supplier-products.js');
  if (source.includes('assets/js/supplier-products.js')) return source;
  return source.replace(
    '<script src="assets/js/product-routes.js"></script>',
    '<script src="assets/js/product-routes.js"></script>\n<script src="assets/js/supplier-products.js"></script>'
  );
}

function addMerge(source, page, marker = 'const products=') {
  const call = `window.cyclifyMergeSupplierProducts(products,"${page}");`;
  if (source.includes(call)) return source;
  const end = arrayEnd(source, marker);
  const semicolon = source.indexOf(';', end);
  return source.slice(0, semicolon + 1) + `\n${call}` + source.slice(semicolon + 1);
}

const categoryPages = ['electronics.html', 'wheels-tyres.html', 'wearables.html', 'components.html', 'bikes-frames.html'];
for (const file of categoryPages) {
  let source = read(file);
  source = addCatalogScript(source);
  source = addMerge(source, file);
  source = source.replace(
    'function getProductCategory(product){\n',
    'function getProductCategory(product){\nif(product.mainCategory){return product.mainCategory;}\n'
  );
  source = source.replace(
    '<div class="ship">Free Shipping</div>',
    '<div class="ship">${product.available===false?"Out of stock":"Free Shipping"}</div>'
  );
  source = source.replace(
    '<button class="add" id="add-${product.id}" onclick="addToCart(event,${product.id})">Add to cart</button>',
    '<button class="add" id="add-${product.id}" ${product.available===false?"disabled":""} onclick="addToCart(event,${product.id})">${product.available===false?"Out of stock":"Add to cart"}</button>'
  );
  source = source.replace(
    'if(!product){return;}\nlet cart=',
    'if(!product||product.available===false){return;}\nlet cart='
  );
  write(file, source);
}

let product = read('product.html');
product = addCatalogScript(product);
product = addMerge(product, '');
product = product.replace(
  'const backLink=document.querySelector(".back");',
  'const backLink=document.querySelector(".back");'
);
product = product.replace(
  'backLink.href=wheelProductIds.includes(product.id)?"wheels-tyres.html":wearableProductIds.includes(product.id)?"wearables.html":componentProductIds.includes(product.id)?"components.html":product.id>=5?"electronics.html":"bikes-frames.html";',
  'backLink.href=product.categoryPage||(wheelProductIds.includes(product.id)?"wheels-tyres.html":wearableProductIds.includes(product.id)?"wearables.html":componentProductIds.includes(product.id)?"components.html":product.id>=5?"electronics.html":"bikes-frames.html");'
);
product = product.replaceAll(
  'const brand=product.id===16?"Cyclami":inferredBrand;',
  'const brand=product.brand||(product.id===16?"Cyclami":inferredBrand);'
);
product = product.replace(
  'availability:"https://schema.org/InStock",',
  'availability:product.available===false?"https://schema.org/OutOfStock":"https://schema.org/InStock",'
);
product = product.replace(
  'function getVariantSize(variant){\nconst values=',
  'function getVariantSize(variant){\nif(product.supplierSynced&&variant.title){return normalizeSizeValue(variant.title);}\nconst values='
);
product = product.replace(
  'productAvailableForCart=!selectedSize||!isSizeUnavailable(selectedSize);\nconst cartButton=document.querySelector(".cartbtn");\nif(cartButton){cartButton.disabled=!productAvailableForCart;}',
  'productAvailableForCart=product.available!==false&&(!selectedSize||!isSizeUnavailable(selectedSize));\ndocument.querySelectorAll(".cartbtn,.buybtn").forEach(button=>{button.disabled=!productAvailableForCart;});\nconst shippingNote=document.querySelector(".shipping-note");\nif(shippingNote&&product.available===false){shippingNote.textContent="Currently out of stock";shippingNote.classList.add("stock-unavailable");}'
);
product = product.replace(
  'const variantAvailability={};',
  'product.available=variants.some(variant=>variant.available);\nconst variantAvailability={};'
);
product = product.replace(
  'if(hasAvailabilityData){\nproduct.sizeAvailability=variantAvailability;',
  'if(hasAvailabilityData){\nproduct.sizeAvailability=variantAvailability;'
);
product = product.replace(
  'applySizeAvailability();\n}\n}\ncatch(error){}',
  'applySizeAvailability();\n}\nupdateCartButtonForSize();\nsetProductSeo();\n}\ncatch(error){}'
);
product = product.replace(
  '.buybtn{',
  '.cartbtn:disabled,.buybtn:disabled{opacity:.45;cursor:not-allowed;filter:grayscale(1)}\n.shipping-note.stock-unavailable{color:#b42318;background:#fff1f0}\n.buybtn{'
);
write('product.html', product);

let index = read('index.html');
index = addCatalogScript(index);
const searchCall = 'window.CYCLIFY_CYCLETIME_PRODUCTS.forEach';
if (!index.includes(searchCall)) {
  const end = arrayEnd(index, 'const searchProducts =');
  const semicolon = index.indexOf(';', end);
  const merge = `\n(window.CYCLIFY_CYCLETIME_PRODUCTS||[]).forEach(product=>{\nconst mapped={id:product.id,name:product.name,price:product.price,image:product.image,category:product.categoryLabel,keywords:product.keywords||""};\nconst existing=searchProducts.find(item=>item.id===product.id);\nif(existing){Object.assign(existing,mapped);}else{searchProducts.push(mapped);}\n});`;
  index = index.slice(0, semicolon + 1) + merge + index.slice(semicolon + 1);
}
write('index.html', index);

let accessories = read('wearables.html');
accessories = accessories
  .replaceAll('wearables.html', 'accessories.html')
  .replaceAll('Wearables', 'Accessories')
  .replaceAll('wearables', 'accessories')
  .replaceAll('Cycling apparel and rider gear', 'Essential cycling add-ons')
  .replaceAll('CAT_Wearables.png', 'CAT_ACC.png')
  .replaceAll('CAT_Accessories.png', 'CAT_ACC.png')
  .replace('Cycling Accessories | Helmets, Shoes, Eyewear and Gloves | Cyclify', 'Cycling Accessories, Mounts, Bags and Pedals | Cyclify')
  .replace('Shop cycling helmets, shoes, jerseys, shorts, smart watches, eyewear and gloves from Cyclify.', 'Shop cycling mounts, bags, bottle cages, pedals, cleats, tapes and essential accessories from Cyclify.');
accessories = replaceArray(accessories, 'const products=', '[]');
accessories = replaceArray(accessories, 'const categories=', `[
{key:"mounts-cases",label:"Mounts & Cases",image:"assets/categories/CAT_ACC.png"},
{key:"bags",label:"Bags",image:"assets/categories/CAT_ACC.png"},
{key:"bottle-cages",label:"Bottle Cages",image:"assets/categories/CAT_ACC.png"},
{key:"pedals-cleats",label:"Pedals & Cleats",image:"assets/categories/CAT_ACC.png"},
{key:"tapes",label:"Tapes",image:"assets/categories/CAT_ACC.png"},
{key:"other",label:"Other",image:"assets/categories/CAT_ACC.png"}
]`);
accessories = accessories.replace('return product.category||"";', 'return product.mainCategory||product.category||"other";');
accessories = accessories.replace('All Accessories', 'All Accessories');
accessories = accessories.replace('Products for this accessory category will appear here', 'No matching accessories are currently available');
accessories = addMerge(accessories, 'accessories.html');
write('accessories.html', accessories);

const packagePath = path.join(root, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.scripts['sync:cycletime'] = 'node scripts/sync-cycletime.js';
packageJson.scripts['sync:catalog'] = 'npm run sync:cycletime && npm run generate:seo';
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

const ignorePath = path.join(root, '.gitignore');
let ignore = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
if (!ignore.split(/\r?\n/).includes('node_modules/')) ignore += (ignore && !ignore.endsWith('\n') ? '\n' : '') + 'node_modules/\n';
fs.writeFileSync(ignorePath, ignore, 'utf8');

console.log('Cycle Time catalogue connected to Cyclify pages.');
