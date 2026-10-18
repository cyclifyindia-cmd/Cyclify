const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadAllowedProductIds, filterAllowedProducts } = require('./product-allowlist');
const { renderSavaA7l } = require('./render-sava-a7l');
const { renderVook } = require('./render-vook');
const { renderVookCollection } = require('./render-vook-seo');
const { renderCatalogSeo } = require('./render-catalog-seo');
const { renderExpandedProduct } = require('./render-expanded-product');
const { deliveryFor, deliverySchemaFor, assertMerchantAvailability } = require('./fulfilment-policy');
const { merchantDescriptionFor } = require('./merchant-description');
const cheerio = require('cheerio');
const { campaign, buildCampaignAssets } = require('./campaign-pricing');
buildCampaignAssets();

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'product.html');
const outputDir = path.join(root, 'products');
const routesPath = path.join(root, 'assets', 'js', 'product-routes.js');
const searchIndexPath = path.join(root, 'assets', 'js', 'search-index.js');
const sitemapPath = path.join(root, 'sitemap.xml');
const merchantFeedPath = path.join(root, 'google-merchant-feed.xml');
const seoStatePath = path.join(root, 'assets', 'data', 'seo-lastmod.json');
const supplierPath = path.join(root, 'assets', 'data', 'cycletime-products.json');
const fccSupplierPath = path.join(root, 'assets', 'data', 'fcc-products.json');
const cadenceSupplierPath = path.join(root, 'assets', 'data', 'cadence-products.json');
const tfsaProductsPath = path.join(root, 'assets', 'js', 'tfsa-products.js');
const expandedProductsPath = path.join(root, 'assets', 'data', 'expanded-products.json');
const guidesPath = path.join(root, 'assets', 'data', 'guides.json');
const allowedProductIds = loadAllowedProductIds();
const categoryCatalogs = [
  { page: 'bikes-frames.html', file: 'catalog-bikes-frames.js' },
  { page: 'wearables.html', file: 'catalog-wearables.js' },
  { page: 'accessories.html', file: 'catalog-accessories.js' },
  { page: 'components.html', file: 'catalog-components.js' },
  { page: 'wheels-tyres.html', file: 'catalog-wheels-tyres.js' },
  { page: 'electronics.html', file: 'catalog-electronics.js' }
];

function supplierProductsFrom(file) {
  if (!fs.existsSync(file)) return [];
  return filterAllowedProducts(JSON.parse(fs.readFileSync(file, 'utf8')).products || [], allowedProductIds);
}

const supplierCatalogues = {
  cycletime: supplierProductsFrom(supplierPath),
  fcc: supplierProductsFrom(fccSupplierPath),
  cadence: supplierProductsFrom(cadenceSupplierPath).filter(item => {
    const normalized = String(item.brand || '') + ' ' + String(item.name || '');
    return !/(xoss|cyclami|thinkrider)/i.test(normalized);
  })
};
const expandedProducts = [
  ...supplierProductsFrom(expandedProductsPath),
  ...supplierProductsFrom(path.join(root, 'assets/data/2xu-products.json')),
  ...supplierProductsFrom(path.join(root, 'assets/data/distributor-products.json')),
  ...supplierProductsFrom(path.join(root, 'assets/data/distributor-products-2.json')),
  ...supplierProductsFrom(path.join(root, 'assets/data/distributor-products-3.json'))
];
const stockLabelScript = 'window.cyclifyStockLabel=product=>product.stockStatus==="coming-soon"?"Coming Soon":(product.stockStatus==="contact"?"Contact for More Info":(product.available===false?"Out of stock":"In stock"));';
const expandedScript = '(function(){const items=' + JSON.stringify(expandedProducts) + ';window.CYCLIFY_EXPANDED_PRODUCTS=items;'+stockLabelScript+'window.cyclifyMergeExpandedProducts=(target,page)=>{items.filter(item=>!page||item.categoryPage===page).forEach(item=>{if(!target.some(product=>String(product.id)===String(item.id)))target.push({...item});});return target;};})();\n';
writeFileWithRetry(path.join(root, 'assets/js/expanded-products.js'), expandedScript);

categoryCatalogs.forEach(({ page, file }) => {
  const catalogue = {
    cycletime: supplierCatalogues.cycletime.filter(item => item.categoryPage === page),
    fcc: supplierCatalogues.fcc.filter(item => item.categoryPage === page),
    cadence: supplierCatalogues.cadence.filter(item => item.categoryPage === page),
    expanded: expandedProducts.filter(item => item.categoryPage === page)
  };
  const source = '(function(){\n' +
    '  const normalise=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"");\n' +
    '  const merge=(target,items,page)=>{items.filter(item=>!page||item.categoryPage===page).forEach(item=>{const existing=target.find(product=>product.id===item.id||(item.sourceHandle&&product.sourceHandle===item.sourceHandle)||(!(item.model&&product.model&&item.model!==product.model)&&normalise(product.name)===normalise(item.name)));if(existing){const id=existing.id;Object.assign(existing,item,{id});}else{target.push({...item});}});return target;};\n' +
    '  const catalogue=' + JSON.stringify(catalogue) + ';\n' +
    '  window.CYCLIFY_CYCLETIME_PRODUCTS=catalogue.cycletime;\n' +
    '  window.CYCLIFY_FCC_PRODUCTS=catalogue.fcc;\n' +
    '  window.CYCLIFY_CADENCE_PRODUCTS=catalogue.cadence;\n' +
    '  window.CYCLIFY_EXPANDED_PRODUCTS=catalogue.expanded;\n' +
    '  window.cyclifyMergeSupplierProducts=(target,page)=>merge(target,catalogue.cycletime,page);\n' +
    '  window.cyclifyMergeFccProducts=(target,page)=>merge(target,catalogue.fcc,page);\n' +
    '  window.cyclifyMergeCadenceProducts=(target,page)=>merge(target,catalogue.cadence,page);\n' +
    '  window.cyclifyMergeExpandedProducts=(target,page)=>merge(target,catalogue.expanded,page);\n' +
    stockLabelScript + '\n' +
    '})();\n';
  writeFileWithRetry(path.join(root, 'assets', 'js', file), source, 'utf8');
});

const versionedScripts = [
  'product-routes.js', 'supplier-products.js', 'fcc-products.js', 'cadence-products.js', 'tfsa-products.js', 'expanded-products.js', 'search-index.js', 'site-footer.js', 'diwali-campaign.js', 'diwali.js', 'diwali-home.js', 'diwali-fireworks.js', 'campaign-storefront.js', 'checkout.js',
  ...categoryCatalogs.map(item => item.file)
];
const scriptVersions = Object.fromEntries(versionedScripts.map(file => {
  const source = fs.readFileSync(path.join(root, 'assets', 'js', file));
  return [file, crypto.createHash('sha256').update(source).digest('hex').slice(0, 10)];
}));

function versionCustomerScripts(source) {
  let updated = source;
  Object.entries(scriptVersions).forEach(([file, version]) => {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    updated = updated.replace(new RegExp('assets/js/' + escaped + '(?:\\?v=[^"\\s<]+)?', 'g'), 'assets/js/' + file + '?v=' + version);
  });
  return updated;
}

const rawTemplate = fs.readFileSync(templatePath, 'utf8');
let template = rawTemplate;
const today = new Date().toISOString().slice(0, 10);
let previousSeoState = {};
try { previousSeoState = JSON.parse(fs.readFileSync(seoStatePath, 'utf8')); }
catch (error) { previousSeoState = {}; }
const nextSeoState = {};

function stableHash(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex').slice(0, 16);
}

function writeFileWithRetry(file, content, encoding = 'utf8') {
  const normalizedContent = typeof content === 'string'
    ? content.replace(/\r\n?/g, '\n').replace(/[\t ]+$/gm, '')
    : content;
  for (let attempt = 1; attempt <= 16; attempt += 1) {
    try {
      if (fs.existsSync(file) && fs.readFileSync(file, encoding) === normalizedContent) return;
      fs.writeFileSync(file, normalizedContent, encoding);
      return;
    } catch (error) {
      const retryable = ['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(error.code);
      if (!retryable || attempt === 16) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(1000, attempt * 100));
    }
  }
}

function lastmodFor(url, fingerprint) {
  const hash = stableHash(fingerprint);
  const previous = previousSeoState[url];
  const lastmod = previous && previous.hash === hash ? previous.lastmod : today;
  nextSeoState[url] = { hash, lastmod };
  return lastmod;
}

function extractProducts(source, marker = 'const products=') {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error('Product data was not found in product.html');
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
    if (char === '"' || char === "'" || char.charCodeAt(0) === 96) {
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(start, i + 1);
        return Function('"use strict"; return (' + literal + ');')();
      }
    }
  }
  throw new Error('Product data array is incomplete.');
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 74);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absoluteUrl(value) {
  if (/^https?:\/\//i.test(String(value))) return String(value);
  return 'https://cyclify.in/' + String(value).replace(/^\/+/, '');
}

function specificationName(value) {
  const label = String(value || '').trim();
  return /^(product\s+)?details?$/i.test(label) ? 'Product Information' : label;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\.{3,}$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function monetaryValue(value) {
  const normalized = String(value == null ? '' : value).replace(/,/g, '').match(/[0-9]+(?:\.[0-9]+)?/);
  return normalized ? Number(normalized[0]) : 0;
}

function merchantIdentifiers(product) {
  const gtin = cleanText(product.gtin || '').replace(/\s+/g, '');
  const validGtin = /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(gtin) ? gtin : '';
  const mpn = cleanText(product.mpn || product.model || '');
  return { gtin: validGtin, mpn };
}

function schemaIdentifiers(product) {
  const identifiers = merchantIdentifiers(product);
  const schema = {};
  if (identifiers.mpn) schema.mpn = identifiers.mpn;
  if (identifiers.gtin) schema['gtin' + identifiers.gtin.length] = identifiers.gtin;
  if (product.model) schema.model = cleanText(product.model);
  return schema;
}

function truncateAtWord(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength + 1).replace(/\s+\S*$/, '').replace(/[,:;.-]+$/, '');
  return shortened || text.slice(0, maxLength).trim();
}

function normalizedProductKey(product) {
  return cleanText(product.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim() + '|' + Number(product.price || 0);
}

function titleFor(product) {
  if (Number(product.id) === 88003) return 'PERTUAL SHARP GR 47/53 Gravel Wheels India | Cyclify';
  if (Number(product.id) === 88001) return 'VOOK V8E Carbon Road Bike India | Cyclify';
  if (Number(product.id) === 88002) return 'VOOK V8E Pro Carbon Road Bike India | Cyclify';
  if (Number(product.id) === 63) return 'SAVA A7L 2026 Carbon Road Bike | Cyclify India';
  const suffix = ' | Cyclify India';
  const maxNameLength = 60 - suffix.length;
  let name = cleanText(product.name);
  if (name.length > maxNameLength) {
    name = name.replace(/\s*\([^)]*\)\s*$/, '');
  }
  return truncateAtWord(name, maxNameLength) + suffix;
}

function usefulDetail(product) {
  const candidates = [product.description].concat(product.specs || []);
  const productName = cleanText(product.name).toLowerCase();
  for (const candidate of candidates) {
    let detail = cleanText(candidate);
    if (!detail || detail.length < 18) continue;
    detail = detail.replace(/^[^:]{1,28}:\s*/, '');
    if (!detail || detail.toLowerCase() === productName) continue;
    return detail;
  }
  return 'Authentic cycling equipment with free shipping across India.';
}

function descriptionFor(product) {
  if (Number(product.id) === 88003) return 'Shop PERTUAL SHARP GR 47/53 carbon gravel wheels at Cyclify India for Rs 99,999. 32 mm internal rims, ceramic bearings, HG/XDR options. Free shipping.';
  if ([88001,88002].includes(Number(product.id))) return 'Buy '+(Number(product.id)===88002?'VOOK V8E Pro':'VOOK V8E')+' carbon road bike in India for Rs '+Number(product.price).toLocaleString('en-IN')+'. 13-speed electronic shifting, '+(Number(product.id)===88002?'Velove carbon':'alloy')+' wheels. Free shipping.';
  if (Number(product.id) === 63) return 'Buy the SAVA A7L 2026 carbon road bike in India for Rs ' + Number(product.price).toLocaleString('en-IN') + '. T800 carbon frame, 24-speed shifting and hydraulic discs. Free shipping.';
  const intro = product.priceOnRequest
    ? 'Pre-order ' + cleanText(product.name) + ' from Cyclify India; selling price is confirmed before payment.'
    : (product.preorderDeposit
      ? 'Pre-order ' + cleanText(product.name) + ' at Cyclify India for Rs ' + Number(product.price).toLocaleString('en-IN') + ' with a Rs ' + Number(product.preorderDeposit).toLocaleString('en-IN') + ' deposit.'
      : 'Shop ' + cleanText(product.name) + ' at Cyclify India for Rs ' + Number(product.price).toLocaleString('en-IN') + '.');
  // Leave headroom for characters such as quotes that expand to HTML entities
  // when the meta description is serialized into the generated page.
  return truncateAtWord(intro + ' ' + usefulDetail(product), 135);
}

function redirectPage(targetUrl, message) {
  const safeTarget = escapeHtml(targetUrl);
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>Moving to Cyclify</title>\n<meta name="robots" content="noindex,follow">\n' +
    '<link rel="canonical" href="' + safeTarget + '">\n' +
    '<meta http-equiv="refresh" content="0;url=' + safeTarget + '">\n' +
    '<script>window.location.replace(' + JSON.stringify(targetUrl) + ');<\/script>\n</head>\n' +
    '<body><p>' + escapeHtml(message || 'This page has moved.') + ' <a href="' + safeTarget + '">Continue to Cyclify</a>.</p></body>\n</html>\n';
}

function existingRoutes() {
  if (!fs.existsSync(routesPath)) return {};
  const source = fs.readFileSync(routesPath, 'utf8');
  const match = source.match(/const routes=(\{[\s\S]*?\});/);
  if (!match) return {};
  try { return JSON.parse(match[1]); }
  catch (error) { return {}; }
}

const products = filterAllowedProducts(extractProducts(template), allowedProductIds);
products.push(...expandedProducts);
if (fs.existsSync(tfsaProductsPath)) {
  products.push(...filterAllowedProducts(extractProducts(fs.readFileSync(tfsaProductsPath, 'utf8'), 'const tfsaProducts='), allowedProductIds));
}
const homepageSearchProducts = extractProducts(
  fs.readFileSync(path.join(root, 'index.html'), 'utf8'),
  'const searchProducts ='
);
const homepageSearchById = new Map(homepageSearchProducts.map(product => [String(product.id), product]));
if (fs.existsSync(supplierPath)) {
  const supplierProducts = JSON.parse(fs.readFileSync(supplierPath, 'utf8')).products || [];
  supplierProducts.forEach(item => {
    const existing = products.find(product => product.id === item.id || product.sourceHandle === item.sourceHandle);
    if (existing) Object.assign(existing, item, { id: existing.id });
    else products.push(item);
  });
}
if (fs.existsSync(fccSupplierPath)) {
  const supplierProducts = JSON.parse(fs.readFileSync(fccSupplierPath, 'utf8')).products || [];
  supplierProducts.forEach(item => {
    const existing = products.find(product => product.id === item.id || product.sourceHandle === item.sourceHandle);
    if (existing) Object.assign(existing, item, { id: existing.id });
    else products.push(item);
  });
}
if (fs.existsSync(cadenceSupplierPath)) {
  const supplierProducts = JSON.parse(fs.readFileSync(cadenceSupplierPath, 'utf8')).products || [];
  supplierProducts.forEach(item => {
    const existing = products.find(product => product.id === item.id || product.sourceHandle === item.sourceHandle);
    if (existing) Object.assign(existing, item, { id: existing.id });
    else products.push(item);
  });
}
const previousRoutes = existingRoutes();
const manualCategoryById = new Map();
categoryCatalogs.forEach(({ page }) => {
  extractProducts(fs.readFileSync(path.join(root, page), 'utf8')).forEach(product => manualCategoryById.set(String(product.id), page));
});
products.forEach(product => {
  if (!product.categoryPage) product.categoryPage = manualCategoryById.get(String(product.id));
});
// Enforce the retained inventory after every supplier merge as well.
const retainedProducts = filterAllowedProducts(products, allowedProductIds);
products.length = 0;
products.push(...retainedProducts);
const primaryByKey = new Map();
const primaryForProduct = new Map();
const primaryProducts = [];
products.forEach(product => {
  const key = normalizedProductKey(product);
  const primary = primaryByKey.get(key);
  if (primary) {
    primaryForProduct.set(String(product.id), primary);
    return;
  }
  primaryByKey.set(key, product);
  primaryForProduct.set(String(product.id), product);
  Object.assign(product, campaign.resolveProduct(product));
  primaryProducts.push(product);
});

const primaryRoutes = new Map(primaryProducts.map(product => {
  const previous = previousRoutes[product.id];
  const newDistributorProduct = Number(product.id) >= 923000 && Number(product.id) < 926000;
  const safePrevious = previous && (!newDistributorProduct || previous.endsWith('-' + product.id + '.html'));
  return [String(product.id), safePrevious ? previous : 'products/' + slugify(product.name) + '-' + product.id + '.html'];
}));
const routes = Object.fromEntries(products.map(product => {
  const primary = primaryForProduct.get(String(product.id));
  return [product.id, primaryRoutes.get(String(primary.id))];
}));
routes[990001] = 'tavelo-arow.html';

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(routesPath), { recursive: true });
const routesSource = '(function(){\n  const routes=' + JSON.stringify(routes, null, 2) + ';\n  window.CYCLIFY_PRODUCT_ROUTES=routes;\n  window.cyclifyProductUrl=function(id){return routes[id]||("product.html?id="+encodeURIComponent(id));};\n})();\n';
writeFileWithRetry(routesPath, routesSource, 'utf8');
scriptVersions['product-routes.js'] = crypto.createHash('sha256').update(routesSource).digest('hex').slice(0, 10);
template = versionCustomerScripts(rawTemplate);

const categoryLabels = {
  'bikes-frames.html': 'Bikes & Frames',
  'wearables.html': 'Wearables',
  'accessories.html': 'Accessories',
  'components.html': 'Components',
  'wheels-tyres.html': 'Wheels & Tyres',
  'electronics.html': 'Electronics'
};
const compactSearchProducts = primaryProducts.map(product => ({
  id: product.id,
  name: cleanText(product.name),
  price: Number(product.price) || 0,
  priceOnRequest: Boolean(product.priceOnRequest),
  url: routes[product.id],
  available: product.available !== false,
  stockStatus: product.stockStatus || '',
  brand: cleanText(product.brand || String(product.name).split(' ')[0]),
  image: product.image || (product.images || [])[0] || 'assets/Logo-dark-preview.png',
  category: product.categoryLabel || categoryLabels[product.categoryPage] || product.category || homepageSearchById.get(String(product.id))?.category || 'Cycling',
  keywords: cleanText(product.keywords || homepageSearchById.get(String(product.id))?.keywords || [product.mainCategory, product.subCategory, product.category].filter(Boolean).join(' '))
}));
compactSearchProducts.push({ id: 990001, name: 'TAVELO Arow Carbon Aero Road Bike', price: 390000,
  image: 'assets/products/tavelo-arow/customer-reference-1.png', category: 'Bikes & Frames',
  keywords: 'TAVELO Arow aero road bike carbon custom build Shimano Di2', customBuild: true,
  url: 'tavelo-arow.html', available: true, stockStatus: '', brand: 'TAVELO' });
const searchIndexSource = 'window.CYCLIFY_SEARCH_PRODUCTS=' + JSON.stringify(compactSearchProducts) + ';\n';
writeFileWithRetry(searchIndexPath, searchIndexSource, 'utf8');
scriptVersions['search-index.js'] = crypto.createHash('sha256').update(searchIndexSource).digest('hex').slice(0, 10);
scriptVersions['site-footer.js'] = require('./build-search-assets').refreshSearchLoader();

const generatedRoutes = new Set();
const productLastmods = new Map();
for (const product of primaryProducts) {
  const route = routes[product.id];
  generatedRoutes.add(route);
  const canonical = 'https://cyclify.in/' + route;
  productLastmods.set(canonical, lastmodFor(canonical, {
    name: product.name,
    description: product.description,
    price: product.price,
    mrp: product.mrp,
    preorderDeposit: product.preorderDeposit,
    available: product.available,
    sizes: product.sizes,
    sizeAvailability: product.sizeAvailability,
    images: product.images,
    specs: product.specs,
    categoryPage: product.categoryPage
  }));
  const title = titleFor(product);
  const description = descriptionFor(product);
  const image = absoluteUrl(product.image || (product.images || [])[0] || 'assets/Logo-dark-preview.png');
  const inferredBrand = (product.name.match(/^(SAVA|ELVES|TFSA|Cyclami|ThinkRider|Orome|iGPSPORT|MET|Cairbull|ELSIER|RIRO|TOSEEK)/i) || ['Cyclify'])[0];
  const brand = product.brand || (product.id === 16 ? 'Cyclami' : inferredBrand);
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyclify.in/' }
  ];
  if (product.categoryPage) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: product.categoryLabel || categoryLabels[product.categoryPage.split('?')[0]] || 'Products',
      item: 'https://cyclify.in/' + product.categoryPage
    });
  }
  breadcrumbItems.push({ '@type': 'ListItem', position: breadcrumbItems.length + 1, name: product.name, item: canonical });
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': canonical + '#product',
        name: product.name,
        image: (product.images && product.images.length ? product.images : [product.image]).filter(image => image && (Number(product.id) !== 63 || /\/(?:blue|white|grey|red|black)-(?:angle|side)\.jpg$/.test(image))).map(absoluteUrl),
        description,
        sku: 'CYCLIFY-' + product.id,
        brand: { '@type': 'Brand', name: brand },
        ...schemaIdentifiers(product),
        ...(product.inventorySource === '2xu-stock-20261012' ? {model:product.model,mpn:product.mpn,...(product.gtin?{gtin13:product.gtin}:{}),size:product.purchaseVariants.find(v=>v.key===product.defaultVariantKey).size,color:product.purchaseVariants.find(v=>v.key===product.defaultVariantKey).colour} : {}),
        ...([88001,88002].includes(Number(product.id)) ? {model:Number(product.id)===88002?'V8E Pro — Cyclify carbon-wheel build':'V8E',alternateName:Number(product.id)===88002?'VOOK V8E Pro Velove carbon-wheel bike':['VOOK V8E','VOOK V8 carbon road bike'],category:'Carbon road bike',color:product.secondaryOptions.join(', '),size:product.sizes.join(', ')} : {}),
        additionalProperty: (product.specs || []).map(spec => {
          const raw = String(spec || '');
          const separator = raw.indexOf(':');
          return separator > 0 ? {
            '@type': 'PropertyValue',
            name: specificationName(raw.slice(0, separator)),
            value: raw.slice(separator + 1).trim()
          } : null;
        }).filter(Boolean),
        offers: {
          '@type': 'Offer',
          url: canonical,
          priceCurrency: 'INR',
          price: String(product.price),
          ...(product.campaignOffer ? { priceValidUntil: '2026-11-10' } : {}),
          availability: product.available === false ? 'https://schema.org/OutOfStock' : (product.preorder ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock'),
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', '@id': 'https://cyclify.in/#organization', name: 'CYCLIFY INDIA', url: 'https://cyclify.in/' },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            ...(deliverySchemaFor(product) ? {deliveryTime: deliverySchemaFor(product)} : {}),
            shippingRate: {
              '@type': 'MonetaryAmount',
              value: '0',
              currency: 'INR'
            },
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: 'IN'
            }
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'IN',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 7,
            refundType: 'https://schema.org/ExchangeRefund',
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
            merchantReturnLink: 'https://cyclify.in/exchange-policy.html'
          }
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems
      }
    ]
  };
  if (product.priceOnRequest || !(Number(product.price) > 0)) {
    delete schema['@graph'][0].offers;
  }

  let page = template;
  page = page.replace('<head>', '<head>\n<base href="../">');
  page = page.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(title) + '</title>');
  page = page.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escapeHtml(description) + '">');
  page = page.replace('<meta name="robots" content="noindex,follow">', '<meta name="robots" content="index,follow,max-image-preview:large">');
  page = page.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + canonical + '">');
  page = page.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + escapeHtml(title) + '">');
  page = page.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + escapeHtml(description) + '">');
  page = page.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + canonical + '">');
  page = page.replace(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + escapeHtml(image) + '">');
  page = page.replace(
    /<meta property="og:image" content="[^"]*">/,
    '$&\n<meta property="og:image:secure_url" content="' + escapeHtml(image) + '">\n<meta property="og:image:alt" content="' + escapeHtml(product.name) + '">'
  );
  page = page.replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + escapeHtml(title) + '">');
  page = page.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + escapeHtml(description) + '">');
  page = page.replace(/<meta name="twitter:image" content="[^"]*">/, '<meta name="twitter:image" content="' + escapeHtml(image) + '">');
  page = page.replace(
    /<meta name="twitter:image" content="[^"]*">/,
    '$&\n<meta name="twitter:image:alt" content="' + escapeHtml(product.name) + '">\n<link rel="preload" as="image" href="' + escapeHtml(image) + '" fetchpriority="high">'
  );
  page = page.replace(
    /<script src="assets\/js\/product-routes\.js(?:\?v=[^"]+)?"><\/script>/,
    '<script>window.CYCLIFY_PRODUCT_ID=' + product.id + ';</script>\n$&'
  );
  page = page.replace('</head>', '<script type="application/ld+json" id="cyclify-product-schema">\n' + JSON.stringify(schema, null, 2).replace(/<\//g, '<\\/') + '\n</script>\n</head>');
  const noscriptPrice = product.priceOnRequest ? 'Price on request' : 'Price: Rs ' + Number(product.price).toLocaleString('en-IN');
  page = page.replace(
    '<img id="productImage">',
    '<img id="productImage" src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '" loading="eager" decoding="async" fetchpriority="high" itemprop="image">'
  );
  page = page.replace('<body>', '<body>\n<noscript><main style="max-width:900px;margin:30px auto;padding:20px;background:#fff"><img src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '" style="display:block;max-width:100%;height:auto;margin:0 auto 20px"><h1>' + escapeHtml(product.name) + '</h1><p>' + escapeHtml(noscriptPrice) + '</p><p>' + escapeHtml(description) + '</p></main></noscript>');
  const $product = cheerio.load(page);
  $product('#productName').text(product.name);
  $product('#sizeSection .size-label').text(product.primaryLabel || 'Select Size');
  $product('#breadcrumbProductName').text(product.name);
  if (product.categoryPage) $product('#productCategoryLink').attr('href', product.categoryPage).text(product.categoryLabel || categoryLabels[product.categoryPage.split('?')[0]] || 'Products');
  const sellingPrice = Number(product.price) || 0;
  const listPrice = monetaryValue(product.mrp);
  const saving = Math.max(0, listPrice - sellingPrice);
  $product('#productPrice').text(product.priceOnRequest ? 'Price on request' : '₹' + campaign.formatPrice(sellingPrice));
  if(product.priceLabel)$product('#productDealWord').text(product.priceLabel);
  if(product.campaignOffer)$product('#productPriceLine').after('<p id="campaignProductOffer" style="font-size:12px;color:#77521d;margin:10px 0">Diwali offer · Regular ₹'+campaign.formatPrice(product.regularPrice)+'</p>');
  $product('#productMrp').text(listPrice && !product.priceOnRequest ? 'MRP ₹' + listPrice.toLocaleString('en-IN') : '');
  $product('#productSave').text(saving && !product.priceOnRequest ? 'Save ₹' + campaign.formatPrice(saving) : '');
  $product('#productDiscount').text(saving && !product.priceOnRequest ? Math.round(saving / listPrice * 100) + '% OFF' : '');
  $product('#specSummaryText').text(product.description || 'Specifications and compatibility for ' + product.name + '.');
  $product('#specList').html('<ul>' + (product.specs || []).map(spec => '<li>' + escapeHtml(spec) + '</li>').join('') + '</ul>');
  if (product.available === false) {
    $product('#productFulfilment').removeAttr('hidden').text('Out of stock');
    $product('#productButtons button').attr('disabled', '').text('Out of stock');
  }
  page = renderSavaA7l($product.html(), product);
  page = renderVook(page, product);
  page = renderExpandedProduct(page, product);
  // Template/SEO changes are meaningful content updates, not just catalogue edits.
  productLastmods.set(canonical, lastmodFor(canonical, page.replace(/\?v=[^"\s<]+/g, '')));
  writeFileWithRetry(path.join(root, route), page, 'utf8');
}

const primaryByNameAndPrice = new Map(primaryProducts.map(product => [normalizedProductKey(product), product]));
const staleProductFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.html'));
staleProductFiles.forEach(file => {
  const relativeRoute = 'products/' + file;
  if (generatedRoutes.has(relativeRoute)) return;
  const source = fs.readFileSync(path.join(outputDir, file), 'utf8');
  const idMatch = source.match(/window\.CYCLIFY_PRODUCT_ID=([^;]+);/);
  let targetRoute = idMatch ? routes[String(idMatch[1]).replace(/['"]/g, '')] : '';
  if (!targetRoute) {
    const nameMatch = source.match(/"@type":\s*"Product"[\s\S]*?"name":\s*"([^"]+)"/);
    const priceMatch = source.match(/"price":\s*"?([0-9.]+)"?/);
    if (nameMatch && priceMatch) {
      const primary = primaryByNameAndPrice.get(normalizedProductKey({ name: nameMatch[1], price: Number(priceMatch[1]) }));
      if (primary) targetRoute = routes[primary.id];
    }
  }
  if (!targetRoute) {
    fs.unlinkSync(path.join(outputDir, file));
    return;
  }
  if (targetRoute === relativeRoute) return;
  const targetUrl = 'https://cyclify.in/' + targetRoute;
  writeFileWithRetry(path.join(outputDir, file), redirectPage(targetUrl, 'This product now has one official Cyclify page.'), 'utf8');
});

const landingPages = [
  { file: 'vook-bikes.html', source: 'bikes-frames.html', category: 'vook', title: 'VOOK Bikes India | V8E Carbon Road Bikes | Cyclify', heading: 'VOOK Carbon Road Bikes in India', description: 'Shop VOOK V8E and V8E Pro carbon road bikes in India. Compare electronic 13-speed bikes, alloy or Velove carbon wheels, frame sizes and colours.' },
  { file: 'smart-trainers.html', source: 'electronics.html', category: 'smart-trainer', title: 'Smart Bike Trainers in India | Cyclify', heading: 'Smart Bike Trainers', description: 'Shop smart bike trainers and indoor cycling accessories in India with genuine products and free shipping from Cyclify.' },
  { file: 'bike-computers.html', source: 'electronics.html', category: 'bike-computer', title: 'GPS Bike Computers in India | Cyclify', heading: 'GPS Bike Computers', description: 'Shop GPS bike computers for navigation, training data and connected cycling from Cyclify India.' },
  { file: 'bike-lights.html', source: 'electronics.html', category: 'lights', title: 'Bicycle Lights in India | Cyclify', heading: 'Bicycle Lights', description: 'Shop rechargeable bicycle headlights and smart tail lights for safer rides across India.' },
  { file: 'electric-bike-pumps.html', source: 'electronics.html', category: 'electric-pump', title: 'Electric Bike Pumps in India | Cyclify', heading: 'Electric Bike Pumps', description: 'Shop compact electric bicycle pumps and portable tyre inflators with free shipping across India.' },
  { file: 'cycling-sensors.html', source: 'electronics.html', category: 'sensors', title: 'Cycling Sensors in India | Cyclify', heading: 'Cycling Sensors', description: 'Shop cadence, speed and heart-rate sensors for indoor training and outdoor cycling in India.' },
  { file: 'carbon-wheelsets.html', source: 'wheels-tyres.html', category: 'wheels', sub: 'carbon', title: 'Carbon Road Bike Wheelsets India | Cyclify', heading: 'Carbon Road Bike Wheelsets', description: 'Shop lightweight carbon road bike wheelsets for aerodynamic performance from Cyclify India.' },
  { file: 'bicycle-tubes.html', source: 'wheels-tyres.html', category: 'tubes', title: 'Bicycle Tubes in India | Cyclify', heading: 'Bicycle Tubes', description: 'Shop lightweight TPU and bicycle inner tubes in popular road cycling sizes from Cyclify India.' },
  { file: 'cycling-helmets.html', source: 'wearables.html', category: 'helmets', title: 'Road Cycling Helmets in India | Cyclify', heading: 'Road Cycling Helmets', description: 'Shop road and MTB cycling helmets in India with size options from leading cycling brands.' },
  { file: 'cycling-shoes.html', source: 'wearables.html', category: 'shoes', title: 'Road Cycling Shoes in India | Cyclify', heading: 'Road Cycling Shoes', description: 'Shop performance road cycling shoes in India with clear size options and free shipping.' },
  { file: 'bike-drivetrain.html', source: 'components.html', category: 'drivetrain', title: 'Bike Drivetrain Components India | Cyclify', heading: 'Bike Drivetrain Components', description: 'Shop bicycle cranksets, chainrings, cassettes and drivetrain upgrades from Cyclify India.' },
  { file: 'road-bikes-india.html', source: 'bikes-frames.html', category: 'road-bikes', title: 'Road Bikes Online in India | Cyclify', heading: 'Road Bikes Online in India', description: 'Compare road bicycles for fitness, endurance and racing in India, with current prices, frame sizes, specifications and availability from Cyclify.' },
  { file: 'mountain-bikes-india.html', source: 'bikes-frames.html', category: 'mountain-bikes', title: 'Mountain Bikes Online in India | Cyclify', heading: 'Mountain Bikes Online in India', description: 'Shop mountain bikes for trails and mixed Indian roads. Compare wheel size, suspension, gearing, brakes, price and current availability at Cyclify.' },
  { file: 'hybrid-bicycles-india.html', source: 'bikes-frames.html', category: 'road-and-hybrid-bikes', title: 'Hybrid Bicycles Online India | Cyclify', heading: 'Hybrid and Fitness Bicycles', description: 'Explore hybrid and fitness bicycles for commuting, exercise and weekend rides in India, with clear specifications, prices and availability.' },
  { file: 'carbon-bike-frames-india.html', source: 'bikes-frames.html', category: 'frames', title: 'Carbon Bike Frames in India | Cyclify', heading: 'Carbon Bicycle Frames and Framesets', description: 'Compare carbon road bike frames and framesets in India by size, geometry, brake type, compatibility, price and availability.' },
  { file: 'bicycle-tools-india.html', source: 'components.html', category: 'tools', title: 'Bicycle Tools Online in India | Cyclify', heading: 'Bicycle Tools and Workshop Equipment', description: 'Shop bicycle repair tools, torque tools, chain tools, crank tools and workshop equipment online in India from Cyclify.' },
  { file: 'bicycle-maintenance-products.html', source: 'components.html', category: 'maintenance', title: 'Bicycle Maintenance Products India | Cyclify', heading: 'Bicycle Maintenance and Lubrication', description: 'Shop bicycle chain lubricants, cleaners and maintenance products for road, mountain and everyday cycles in India.' },
  { file: 'cycling-sunglasses-india.html', source: 'wearables.html', category: 'eyewear', title: 'Cycling Sunglasses Online India | Cyclify', heading: 'Cycling Sunglasses and Eyewear', description: 'Shop cycling sunglasses and performance eyewear in India. Compare lens options, fit, protection, colours, prices and availability.' },
  { file: 'cycling-jerseys-shorts-india.html', source: 'wearables.html', category: 'jersey-shorts', title: 'Cycling Jerseys & Shorts India | Cyclify', heading: 'Cycling Jerseys, Bib Shorts and Apparel', description: 'Shop cycling jerseys, bib shorts and riding apparel for Indian weather, with men’s, women’s and unisex options from Cyclify.' },
  { file: 'cycling-gloves-india.html', source: 'wearables.html', category: 'gloves', title: 'Cycling Gloves Online in India | Cyclify', heading: 'Cycling Gloves', description: 'Shop road and mountain bike cycling gloves in India for grip, comfort and hand protection, with current sizes and prices.' },
  { file: 'bicycle-bottle-cages-india.html', source: 'accessories.html', category: 'bottle-cages', title: 'Bicycle Bottle Cages India | Cyclify', heading: 'Bicycle Bottle Cages', description: 'Shop lightweight bicycle bottle cages and hydration accessories online in India for road, mountain and hybrid bikes.' },
  { file: 'bicycle-tyres-india.html', source: 'wheels-tyres.html', category: 'tyres', title: 'Bicycle Tyres Online in India | Cyclify', heading: 'Bicycle Tyres', description: 'Compare road, mountain and everyday bicycle tyres online in India by size, tread, construction, price and availability.' },
  { file: 'bicycle-saddles-india.html', source: 'components.html', category: 'saddles', title: 'Bicycle Saddles Online India | Cyclify', heading: 'Bicycle Saddles', description: 'Shop bicycle saddles for road, mountain, fitness and everyday riding in India, with current prices and product specifications.' },
  { file: 'sava-bikes.html', source: 'bikes-frames.html', category: 'sava', title: 'SAVA Carbon Road Bikes India | Cyclify', heading: 'SAVA Carbon Road Bikes', description: 'Shop SAVA carbon road bikes in India with detailed specifications and free shipping from Cyclify.' },
  { file: 'tavelo-bikes.html', source: 'bikes-frames.html', category: 'tavelo', title: 'TAVELO Bikes India | Arow Custom Road Bikes | Cyclify', heading: 'TAVELO Road Bikes', description: 'Explore TAVELO Arow carbon aero road bikes in India. Configure Shimano Di2, AVRO handlebars and wheels, with builds starting at ₹3,90,000.' },
  { file: 'elves-bikes.html', source: 'bikes-frames.html', category: 'elves', title: 'ELVES Carbon Road Bikes India | Cyclify', heading: 'ELVES Carbon Road Bikes', description: 'Shop ELVES carbon road bikes and frames in India with detailed specifications from Cyclify.' },
  { file: 'tfsa-frames.html', source: 'bikes-frames.html', category: 'tfsa', title: 'TFSA Carbon Road Frames India | Cyclify', heading: 'TFSA Carbon Road Frames', description: 'Explore TFSA carbon road frames in India with full frame parameters, manufacturer-numbered sizes, custom painting and multi-angle product photos.' }
];

categoryCatalogs.forEach(({ page: file, file: catalogue }) => {
  let page = fs.readFileSync(path.join(root, file), 'utf8');
  // Download only this category's stock data; keep the existing browser API.
  page = page.replace(/<script src="assets\/js\/supplier-products\.js(?:\?v=[^"]+)?"><\/script>/,
    '<script src="assets/js/' + catalogue + '"></script>');
  page = page.replace(/<script src="assets\/js\/(?:fcc-products|cadence-products)\.js(?:\?v=[^"]+)?"><\/script>\s*/g, '');
  if (file === 'bikes-frames.html') {
    page = page.replace(/Bikes and Frames \| SAVA, ELVES and TFSA \| Cyclify/g, 'Road Bikes & Carbon Frames India | SAVA, TAVELO | Cyclify');
    page = page.replace(/Explore premium road bikes and carbon frames from SAVA, ELVES and TFSA with verified product photos, sizes and specifications\./g,
      'Shop SAVA and ELVES road bikes, configure a TAVELO Arow, or explore TFSA carbon frames. Compare prices, frame sizes and specifications at Cyclify India.');
  }
  const description = cheerio.load(page)('meta[name="description"]').attr('content');
  page = renderCatalogSeo(page, { file, catalogue, heading: categoryLabels[file], description,
    manualProducts: primaryProducts.filter(product => product.categoryPage === file && !product.supplierSynced && product.inventoryGroup !== 'expanded'),
    productNames: Object.fromEntries(primaryProducts.map(product => [product.id, product.name])) });
  writeFileWithRetry(path.join(root, file), versionCustomerScripts(page));
});

landingPages.forEach(landing => {
  let page = fs.readFileSync(path.join(root, landing.source), 'utf8');
  const canonical = 'https://cyclify.in/' + landing.file;
  page = page.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(landing.title) + '</title>');
  page = page.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escapeHtml(landing.description) + '">');
  page = page.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + canonical + '">');
  page = page.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + escapeHtml(landing.title) + '">');
  page = page.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + escapeHtml(landing.description) + '">');
  page = page.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + canonical + '">');
  page = page.replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + escapeHtml(landing.title) + '">');
  page = page.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + escapeHtml(landing.description) + '">');
  page = page.replace(/<(?:span|h1)\s+class="page-heading"[^>]*>[\s\S]*?<\/(?:span|h1)><div class="catalog-tools">/, '<h1 class="page-heading" style="margin:0">' + escapeHtml(landing.heading) + '</h1><div class="catalog-tools">');
  page = page.replace(/let activeCategory=new URLSearchParams\(window\.location\.search\)\.get\("category"\)\|\|"";/, 'let activeCategory=new URLSearchParams(window.location.search).get("category")||' + JSON.stringify(landing.category) + ';');
  if (landing.sub) {
    page = page.replace(/let activeSubCategory=new URLSearchParams\(window\.location\.search\)\.get\("sub"\)\|\|"";/, 'let activeSubCategory=new URLSearchParams(window.location.search).get("sub")||' + JSON.stringify(landing.sub) + ';');
  }
  page = page.replace('<div class="category-strip"', '<p class="seo-landing-copy" style="margin:0;padding:14px 4%;color:#4b5563;font-size:15px;line-height:1.55">' + escapeHtml(landing.description) + '</p>\n<div class="category-strip"');
  page = renderCatalogSeo(page, { file: landing.file, catalogue: categoryCatalogs.find(item => item.page === landing.source).file, category: landing.category, sub: landing.sub, heading: landing.heading, description: landing.description,
    manualProducts: primaryProducts.filter(product => product.categoryPage === landing.source && !product.supplierSynced && product.inventoryGroup !== 'expanded'),
    productNames: Object.fromEntries(primaryProducts.map(product => [product.id, product.name])) });
  if(landing.category==='vook')page=renderVookCollection(page,primaryProducts);
  writeFileWithRetry(path.join(root, landing.file), page, 'utf8');
});

require('./build-tavelo-page');

// Keep the homepage's real HTML links, images and prices in step with inventory.
const $home = cheerio.load(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
require('./diwali-motion').addDiwaliMotion($home,{home:true});
$home('[data-popular-product]').each((_, element) => {
  const card = $home(element);
  const item = primaryProducts.find(product => String(product.id) === card.attr('data-popular-product'));
  if (!item) { card.remove(); return; }
  card.attr('href', routes[item.id]).attr('aria-label', 'View ' + item.name);
  card.find('h3').text(item.name);
  card.find('.cyclify-card-product-image').attr('src', item.image).attr('alt', item.name);
  const price = Number(item.price);
  const mrp = monetaryValue(item.mrp);
  const savings = Math.max(0, mrp - price);
  card.find('.price').text('₹' + price.toLocaleString('en-IN'));
  card.find('.mrp').text(mrp ? 'MRP ₹' + mrp.toLocaleString('en-IN') : '');
  card.find('.cyclify-card-saving').text(savings ? 'Save ₹' + savings.toLocaleString('en-IN') : '');
  card.find('.cyclify-card-discount').text(savings ? Math.round(savings / mrp * 100) + '% OFF' : '');
  if (item.available === false) {
    card.find('.cyclify-card-shipping').text('Out of stock');
    card.find('.home-popular-card__buy').text('View product');
  } else {
    card.find('.cyclify-card-shipping').text('Free Shipping');
    card.find('.home-popular-card__buy').text('Buy Now');
  }
});
$home('.home-category img,.home-feature-band__art img').attr('loading', 'lazy').attr('decoding', 'async');
$home('#cyclify-browse-links').remove();
const discoveryGroups = [
  { code: '01', title: 'Bikes & frames', description: 'Road, mountain, hybrid and carbon', links: [['road-bikes-india.html','Road bikes'],['mountain-bikes-india.html','Mountain bikes'],['hybrid-bicycles-india.html','Hybrid bicycles'],['carbon-bike-frames-india.html','Carbon frames']] },
  { code: '02', title: 'Wheels & electronics', description: 'Wheelsets, trainers, computers and lights', links: [['carbon-wheelsets.html','Carbon wheelsets'],['smart-trainers.html','Smart trainers'],['bike-computers.html','GPS bike computers'],['bike-lights.html','Bike lights']] },
  { code: '03', title: 'Apparel & protection', description: 'Helmets, eyewear, clothing and gloves', links: [['cycling-helmets.html','Cycling helmets'],['cycling-sunglasses-india.html','Cycling sunglasses'],['cycling-jerseys-shorts-india.html','Cycling apparel'],['cycling-gloves-india.html','Cycling gloves']] },
  { code: '04', title: 'Parts & workshop', description: 'Tools, care products, tyres and ride essentials', links: [['bicycle-tools-india.html','Bicycle tools'],['bicycle-maintenance-products.html','Maintenance products'],['bicycle-tyres-india.html','Bicycle tyres'],['bicycle-bottle-cages-india.html','Bottle cages'],['bicycle-saddles-india.html','Bicycle saddles']] }
];
const discoveryMarkup = '<nav id="cyclify-browse-links" class="discovery-deck" aria-label="Explore cycling collections">' +
  '<details class="discovery-deck__inner"><summary class="discovery-deck__trigger"><span><small>CYCLIFY COLLECTIONS</small><strong>Shop by cycling category</strong><em>Bikes, components, gear and accessories</em></span><i aria-hidden="true"></i></summary>' +
  '<div class="discovery-deck__content"><div class="discovery-list">' + discoveryGroups.map(group => '<section class="discovery-box"><div class="discovery-box__heading"><span class="discovery-box__number">' + group.code + '</span><span class="discovery-box__title"><b>' + group.title + '</b><small>' + group.description + '</small></span></div><div class="discovery-box__links">' + group.links.map(([href,label]) => '<a href="' + href + '">' + label + '<b aria-hidden="true">→</b></a>').join('') + '</div></section>').join('') +
  '<section class="discovery-box"><div class="discovery-box__heading"><span class="discovery-box__number">05</span><span class="discovery-box__title"><b>Shop by brand</b><small>Performance bike and frame brands</small></span></div><div class="discovery-box__links">' + [['vook-bikes.html','VOOK'],['sava-bikes.html','SAVA'],['tavelo-bikes.html','TAVELO'],['elves-bikes.html','ELVES'],['tfsa-frames.html','TFSA']].map(([href,label]) => '<a href="' + href + '">' + label + '<b aria-hidden="true">→</b></a>').join('') + '</div></section>' +
  '<a class="discovery-guides" href="guides.html"><span><small>CYCLING KNOWLEDGE</small><strong>Read our cycling guides</strong></span><b aria-hidden="true">→</b></a></div></div>' +
  '</details></nav>';
$home('main').last().after(discoveryMarkup);
writeFileWithRetry(path.join(root, 'index.html'), $home.html());
require('./build-diwali-page').buildDiwaliPage(primaryProducts, routes);

const guides = JSON.parse(fs.readFileSync(guidesPath, 'utf8')).guides || [];
const guideSitemapEntries = [];
guides.forEach(guide => {
  const canonical = 'https://cyclify.in/' + guide.slug + '/';
  const lastmod = lastmodFor(canonical, guide);
  const title = truncateAtWord(guide.title, 48) + ' | Cyclify India';
  const sections = guide.sections.map(section =>
    '<section><h2>' + escapeHtml(section.heading) + '</h2>' +
    section.paragraphs.map(paragraph => '<p>' + escapeHtml(paragraph) + '</p>').join('') +
    '</section>'
  ).join('');
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    mainEntityOfPage: canonical,
    dateModified: lastmod,
    image: 'https://cyclify.in/assets/Logo-dark.png',
    author: { '@type': 'Organization', name: 'Cyclify India', url: 'https://cyclify.in/' },
    publisher: {
      '@type': 'Organization',
      name: 'Cyclify India',
      url: 'https://cyclify.in/',
      logo: { '@type': 'ImageObject', url: 'https://cyclify.in/assets/Logo-dark.png' }
    }
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyclify.in/' },
      { '@type': 'ListItem', position: 2, name: 'Cycling Guides', item: 'https://cyclify.in/guides.html' },
      { '@type': 'ListItem', position: 3, name: guide.title, item: canonical }
    ]
  };
  const schemas = JSON.stringify([articleSchema, breadcrumbSchema], null, 2).replace(/<\//g, '<\\/');
  const page = versionCustomerScripts('<!doctype html>\n<html lang="en">\n<head>\n' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<base href="../">\n<title>' + escapeHtml(title) + '</title>\n' +
    '<meta name="description" content="' + escapeHtml(guide.description) + '">\n' +
    '<meta name="robots" content="index,follow">\n<link rel="canonical" href="' + canonical + '">\n' +
    '<meta property="og:type" content="article"><meta property="og:site_name" content="Cyclify India">\n' +
    '<meta property="og:title" content="' + escapeHtml(guide.title) + '"><meta property="og:description" content="' + escapeHtml(guide.description) + '">\n' +
    '<meta property="og:url" content="' + canonical + '"><meta property="og:image" content="https://cyclify.in/assets/Logo-dark.png">\n' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + escapeHtml(guide.title) + '">\n' +
    '<meta name="twitter:description" content="' + escapeHtml(guide.description) + '"><meta name="twitter:image" content="https://cyclify.in/assets/Logo-dark.png">\n' +
    '<link rel="icon" href="assets/favicon.ico"><link rel="stylesheet" href="assets/css/guide-pages.css">\n' +
    '<script type="application/ld+json">' + schemas + '<\/script>\n</head>\n<body>\n' +
    '<header class="guide-header"><div class="guide-header__inner"><a href="index.html" aria-label="Cyclify India home"><img src="assets/Logo-dark.png" alt="Cyclify India"></a>' +
    '<nav aria-label="Guide navigation"><a href="guides.html">Cycling Guides</a><a href="' + escapeHtml(guide.category) + '">' + escapeHtml(guide.categoryLabel) + '</a></nav></div></header>\n' +
    '<main class="guide-shell"><nav class="guide-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a> &rsaquo; <a href="guides.html">Cycling Guides</a> &rsaquo; <span>' + escapeHtml(guide.title) + '</span></nav>' +
    '<article><header class="guide-hero"><p class="guide-hero__eyebrow">Cyclify buying guide</p><h1>' + escapeHtml(guide.title) + '</h1><p>' + escapeHtml(guide.intro) + '</p></header>' +
    '<div class="guide-article">' + sections + '</div></article>' +
    '<aside class="guide-cta"><div><strong>Explore current ' + escapeHtml(guide.categoryLabel) + '</strong><span>Compare availability, pricing and product details at Cyclify India.</span></div><a href="' + escapeHtml(guide.category) + '">View products</a></aside></main>\n' +
    '<script src="assets/js/site-footer.js"></script>\n</body>\n</html>\n');
  const destination = path.join(root, guide.slug, 'index.html');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  writeFileWithRetry(destination, page, 'utf8');
  guideSitemapEntries.push([canonical, '0.85', lastmod]);
});

const guideCards = guides.map(guide =>
  '<a class="guide-card" href="' + escapeHtml(guide.slug) + '/"><h2>' + escapeHtml(guide.title) + '</h2><p>' + escapeHtml(guide.description) + '</p></a>'
).join('');
const guidesHub = versionCustomerScripts('<!doctype html>\n<html lang="en">\n<head>\n' +
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' +
  '<title>Cycling Guides for Indian Riders | Cyclify India</title>\n' +
  '<meta name="description" content="Practical bicycle buying, maintenance and component guides for Indian riders from Cyclify India.">\n' +
  '<meta name="robots" content="index,follow"><link rel="canonical" href="https://cyclify.in/guides.html">\n' +
  '<meta property="og:type" content="website"><meta property="og:site_name" content="Cyclify India"><meta property="og:title" content="Cycling Guides for Indian Riders">\n' +
  '<meta property="og:description" content="Practical bicycle buying, maintenance and component guides for Indian riders."><meta property="og:url" content="https://cyclify.in/guides.html">\n' +
  '<meta property="og:image" content="https://cyclify.in/assets/Logo-dark.png"><meta name="twitter:card" content="summary_large_image">\n' +
  '<meta name="twitter:title" content="Cycling Guides for Indian Riders"><meta name="twitter:description" content="Practical bicycle buying, maintenance and component guides for Indian riders.">\n' +
  '<meta name="twitter:image" content="https://cyclify.in/assets/Logo-dark.png"><link rel="icon" href="assets/favicon.ico"><link rel="stylesheet" href="assets/css/guide-pages.css">\n' +
  '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Cycling Guides', url: 'https://cyclify.in/guides.html', isPartOf: { '@type': 'WebSite', name: 'Cyclify India', url: 'https://cyclify.in/' } }).replace(/<\//g, '<\\/') + '<\/script>\n' +
  '</head>\n<body><header class="guide-header"><div class="guide-header__inner"><a href="index.html" aria-label="Cyclify India home"><img src="assets/Logo-dark.png" alt="Cyclify India"></a><nav aria-label="Guide navigation"><a href="index.html">Shop</a><a href="contact-us.html">Contact</a></nav></div></header>\n' +
  '<main class="guide-shell"><nav class="guide-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a> &rsaquo; <span>Cycling Guides</span></nav>' +
  '<header class="guide-hero"><p class="guide-hero__eyebrow">Ride better</p><h1>Cycling Guides for Indian Riders</h1><p>Clear, practical advice for choosing bicycles, components and riding equipment without marketing confusion.</p></header>' +
  '<section class="guide-grid" aria-label="Cycling guide library">' + guideCards + '</section></main><script src="assets/js/site-footer.js"></script></body>\n</html>\n');
writeFileWithRetry(path.join(root, 'guides.html'), guidesHub, 'utf8');

fs.readdirSync(root).filter(file => file.endsWith('.html')).forEach(file => {
  const filePath = path.join(root, file);
  const source = fs.readFileSync(filePath, 'utf8');
  const updated = versionCustomerScripts(source);
  if (updated !== source) writeFileWithRetry(filePath, updated, 'utf8');
});

const legacyRedirects = {
  'home/index.html': 'https://cyclify.in/',
  'collections/bikes-frames/index.html': 'https://cyclify.in/bikes-frames.html',
  'collections/electronics/index.html': 'https://cyclify.in/electronics.html',
  'collections/wheels-tyres/index.html': 'https://cyclify.in/wheels-tyres.html',
  'collections/components/index.html': 'https://cyclify.in/components.html',
  'collections/wearables/index.html': 'https://cyclify.in/wearables.html',
  'collections/accessories/index.html': 'https://cyclify.in/accessories.html',
  'collections/all/index.html': 'https://cyclify.in/'
};
Object.entries(legacyRedirects).forEach(([file, target]) => {
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  writeFileWithRetry(destination, redirectPage(target, 'This Cyclify page has moved.'), 'utf8');
});

const excludedPages = new Set(['product.html', 'account.html', 'cart.html']);
const seenCanonicals = new Set();
const staticPages = fs.readdirSync(root)
  .filter(file => file.endsWith('.html') && !excludedPages.has(file))
  .map(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (!/<meta name="robots" content="index,follow(?:,[^"]*)?">/i.test(source)) return null;
    const canonical = source.match(/<link rel="canonical" href="([^"]+)">/i);
    if (!canonical || seenCanonicals.has(canonical[1])) return null;
    seenCanonicals.add(canonical[1]);
    const fingerprint = source.replace(/\?v=[^"\s<]+/g, '');
    const isTavelo = file === 'tavelo-arow.html';
    return [canonical[1], canonical[1] === 'https://cyclify.in/' ? '1.0' : '0.9', lastmodFor(canonical[1], fingerprint),
      isTavelo ? 'https://cyclify.in/assets/products/tavelo-arow/customer-reference-1.png' : null,
      isTavelo ? 'TAVELO Arow Carbon Aero Road Bike' : null];
  })
  .filter(Boolean);
const urls = staticPages.concat(primaryProducts.map(product => {
  const url = 'https://cyclify.in/' + routes[product.id];
  return [
    url,
    '0.8',
    productLastmods.get(url) || today,
    absoluteUrl(product.image || (product.images || [])[0] || 'assets/Logo-dark-preview.png'),
    cleanText(product.name)
  ];
})).concat(guideSitemapEntries);
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  urls.map(([url, priority, lastmod, imageUrl, imageTitle]) => {
    const imageEntry = imageUrl
      ? '<image:image><image:loc>' + escapeXml(imageUrl) + '</image:loc><image:title>' + escapeXml(imageTitle || '') + '</image:title></image:image>'
      : '';
    return '  <url><loc>' + escapeXml(url) + '</loc><lastmod>' + lastmod + '</lastmod><changefreq>weekly</changefreq><priority>' + priority + '</priority>' + imageEntry + '</url>';
  }).join('\n') +
  '\n</urlset>\n';
writeFileWithRetry(sitemapPath, sitemap, 'utf8');

const merchantItems = primaryProducts
  .filter(product => Number(product.price) > 0 && !product.priceOnRequest)
  .map(product => {
    assertMerchantAvailability(product);
    const delivery = deliveryFor(product);
    const route = routes[product.id];
    const link = 'https://cyclify.in/' + route;
    const primaryImage = absoluteUrl(product.image || (product.images || [])[0] || 'assets/Logo-dark-preview.png');
    const additionalImages = (product.images || [])
      .map(absoluteUrl)
      .filter(imageUrl => imageUrl !== primaryImage)
      .slice(0, 10);
    const inferredBrand = (product.name.match(/^(SAVA|ELVES|TFSA|Cyclami|ThinkRider|Orome|iGPSPORT|MET|Cairbull|ELSIER|RIRO|TOSEEK)/i) || ['Cyclify'])[0];
    const brand = product.brand || (product.id === 16 ? 'Cyclami' : inferredBrand);
    const identifiers = merchantIdentifiers(product);
    const currentPrice = monetaryValue(product.price);
    const campaignRule = campaign.ruleFor(product.id);
    const listPrice = campaignRule ? campaignRule.regularPrice : Math.max(currentPrice, monetaryValue(product.mrp) || currentPrice);
    const salePrice = listPrice > currentPrice ? '<g:sale_price>' + currentPrice.toFixed(2) + ' INR</g:sale_price>' : '';
    return '    <item>\n' +
      '      <g:id>CYCLIFY-' + escapeXml(product.id) + '</g:id>\n' +
      '      <title>' + escapeXml(cleanText(product.name)) + '</title>\n' +
      '      <description>' + escapeXml(merchantDescriptionFor(product)) + '</description>\n' +
      '      <link>' + escapeXml(link) + '</link>\n' +
      '      <g:canonical_link>' + escapeXml(link) + '</g:canonical_link>\n' +
      '      <g:image_link>' + escapeXml(primaryImage) + '</g:image_link>\n' +
      additionalImages.map(imageUrl => '      <g:additional_image_link>' + escapeXml(imageUrl) + '</g:additional_image_link>').join('\n') + (additionalImages.length ? '\n' : '') +
      '      <g:availability>' + (product.available === false ? 'out_of_stock' : (product.preorder ? 'preorder' : 'in_stock')) + '</g:availability>\n' +
      (product.available !== false && product.preorder ? '      <g:availability_date>'+escapeXml(product.availabilityDate)+'</g:availability_date>\n' : '') +
      (delivery ? '      <g:min_handling_time>'+delivery.handling.min+'</g:min_handling_time>\n      <g:max_handling_time>'+delivery.handling.max+'</g:max_handling_time>\n' : '') +
      (delivery?.shippingLabel ? '      <g:shipping_label>'+escapeXml(delivery.shippingLabel)+'</g:shipping_label>\n' : '') +
      '      <g:condition>new</g:condition>\n' +
      '      <g:price>' + listPrice.toFixed(2) + ' INR</g:price>\n' +
      (salePrice ? '      ' + salePrice + '\n' : '') +
      (product.campaignOffer ? '      <g:sale_price_effective_date>'+campaign.config.startsAt+'/'+campaign.config.endsAt+'</g:sale_price_effective_date>\n' : '') +
      '      <g:brand>' + escapeXml(brand) + '</g:brand>\n' +
      (identifiers.gtin ? '      <g:gtin>' + escapeXml(identifiers.gtin) + '</g:gtin>\n' : '') +
      (identifiers.mpn ? '      <g:mpn>' + escapeXml(identifiers.mpn) + '</g:mpn>\n' : '') +
      (!identifiers.gtin && !identifiers.mpn ? '      <g:identifier_exists>no</g:identifier_exists>\n' : '') +
      (product.inventorySource === '2xu-stock-20261012' ? '      <g:size>'+escapeXml(product.purchaseVariants.find(v=>v.key===product.defaultVariantKey).size)+'</g:size>\n      <g:color>'+escapeXml(product.purchaseVariants.find(v=>v.key===product.defaultVariantKey).colour)+'</g:color>\n      <g:gender>'+(product.gender==='Men'?'male':product.gender==='Women'?'female':'unisex')+'</g:gender>\n' : '') +
      '      <g:product_type>' + escapeXml(product.categoryLabel || categoryLabels[product.categoryPage] || product.category || 'Cycling') + '</g:product_type>\n' +
      '      <g:shipping><g:country>IN</g:country><g:service>Standard</g:service><g:price>0.00 INR</g:price>'+
      (delivery ? '<g:min_transit_time>'+delivery.transit.min+'</g:min_transit_time><g:max_transit_time>'+delivery.transit.max+'</g:max_transit_time>' : '') + '</g:shipping>\n' +
      '    </item>';
  });
const merchantFeed = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
  '  <channel>\n' +
  '    <title>Cyclify India Product Feed</title>\n' +
  '    <link>https://cyclify.in/</link>\n' +
  '    <description>Current Cyclify India cycling catalogue</description>\n' +
  merchantItems.join('\n') + '\n' +
  '  </channel>\n' +
  '</rss>\n';
writeFileWithRetry(merchantFeedPath, merchantFeed, 'utf8');
writeFileWithRetry(seoStatePath, JSON.stringify(nextSeoState, null, 2) + '\n', 'utf8');

console.log('Generated ' + primaryProducts.length + ' canonical product pages, ' + landingPages.length + ' landing pages, ' + guides.length + ' guides, redirects, and sitemap.');
console.log('Consolidated ' + (products.length - primaryProducts.length) + ' duplicate product records.');
