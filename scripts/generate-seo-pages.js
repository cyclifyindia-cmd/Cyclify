const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'product.html');
const outputDir = path.join(root, 'products');
const routesPath = path.join(root, 'assets', 'js', 'product-routes.js');
const sitemapPath = path.join(root, 'sitemap.xml');
const supplierPath = path.join(root, 'assets', 'data', 'cycletime-products.json');
const fccSupplierPath = path.join(root, 'assets', 'data', 'fcc-products.json');
const cadenceSupplierPath = path.join(root, 'assets', 'data', 'cadence-products.json');
const template = fs.readFileSync(templatePath, 'utf8');

function extractProducts(source) {
  const marker = 'const products=';
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
  const intro = 'Shop ' + cleanText(product.name) + ' at Cyclify India for Rs ' + Number(product.price).toLocaleString('en-IN') + '.';
  return truncateAtWord(intro + ' ' + usefulDetail(product), 150);
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

const products = extractProducts(template);
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
  primaryProducts.push(product);
});

const primaryRoutes = new Map(primaryProducts.map(product => [
  String(product.id),
  previousRoutes[product.id] || 'products/' + slugify(product.name) + '-' + product.id + '.html'
]));
const routes = Object.fromEntries(products.map(product => {
  const primary = primaryForProduct.get(String(product.id));
  return [product.id, primaryRoutes.get(String(primary.id))];
}));

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(routesPath), { recursive: true });
fs.writeFileSync(
  routesPath,
  '(function(){\n  const routes=' + JSON.stringify(routes, null, 2) + ';\n  window.CYCLIFY_PRODUCT_ROUTES=routes;\n  window.cyclifyProductUrl=function(id){return routes[id]||("product.html?id="+encodeURIComponent(id));};\n})();\n',
  'utf8'
);

const generatedRoutes = new Set();
for (const product of primaryProducts) {
  const route = routes[product.id];
  generatedRoutes.add(route);
  const canonical = 'https://cyclify.in/' + route;
  const title = titleFor(product);
  const description = descriptionFor(product);
  const image = absoluteUrl(product.image || (product.images || [])[0] || 'assets/Logo-dark-preview.png');
  const inferredBrand = (product.name.match(/^(SAVA|ELVES|Cyclami|ThinkRider|Orome|iGPSPORT|MET|Cairbull|ELSIER|RIRO|TOSEEK)/i) || ['Cyclify'])[0];
  const brand = product.brand || (product.id === 16 ? 'Cyclami' : inferredBrand);
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': canonical + '#product',
        name: product.name,
        image: (product.images && product.images.length ? product.images : [product.image]).filter(Boolean).map(absoluteUrl),
        description,
        sku: 'CYCLIFY-' + product.id,
        brand: { '@type': 'Brand', name: brand },
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
          availability: product.available === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          shippingDetails: {
            '@type': 'OfferShippingDetails',
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
            returnMethod: 'https://schema.org/ReturnByMail',
            merchantReturnLink: 'https://cyclify.in/exchange-policy.html'
          }
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyclify.in/' },
          { '@type': 'ListItem', position: 2, name: product.name, item: canonical }
        ]
      }
    ]
  };

  let page = template;
  page = page.replace('<head>', '<head>\n<base href="../">');
  page = page.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(title) + '</title>');
  page = page.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escapeHtml(description) + '">');
  page = page.replace('<meta name="robots" content="noindex,follow">', '<meta name="robots" content="index,follow">');
  page = page.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + canonical + '">');
  page = page.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + escapeHtml(title) + '">');
  page = page.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + escapeHtml(description) + '">');
  page = page.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + canonical + '">');
  page = page.replace(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + escapeHtml(image) + '">');
  page = page.replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + escapeHtml(title) + '">');
  page = page.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + escapeHtml(description) + '">');
  page = page.replace(/<meta name="twitter:image" content="[^"]*">/, '<meta name="twitter:image" content="' + escapeHtml(image) + '">');
  page = page.replace('<script src="assets/js/product-routes.js"></script>', '<script>window.CYCLIFY_PRODUCT_ID=' + product.id + ';</script>\n<script src="assets/js/product-routes.js"></script>');
  page = page.replace('</head>', '<script type="application/ld+json" id="cyclify-product-schema">\n' + JSON.stringify(schema, null, 2).replace(/<\//g, '<\\/') + '\n</script>\n</head>');
  page = page.replace('<body>', '<body>\n<noscript><main style="max-width:900px;margin:30px auto;padding:20px;background:#fff"><h1>' + escapeHtml(product.name) + '</h1><p>Price: Rs ' + Number(product.price).toLocaleString('en-IN') + '</p><p>' + escapeHtml(description) + '</p></main></noscript>');
  fs.writeFileSync(path.join(root, route), page, 'utf8');
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
  if (!targetRoute || targetRoute === relativeRoute) return;
  const targetUrl = 'https://cyclify.in/' + targetRoute;
  fs.writeFileSync(path.join(outputDir, file), redirectPage(targetUrl, 'This product now has one official Cyclify page.'), 'utf8');
});

const landingPages = [
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
  { file: 'sava-bikes.html', source: 'bikes-frames.html', category: 'sava', title: 'SAVA Carbon Road Bikes India | Cyclify', heading: 'SAVA Carbon Road Bikes', description: 'Shop SAVA carbon road bikes in India with detailed specifications and free shipping from Cyclify.' },
  { file: 'elves-bikes.html', source: 'bikes-frames.html', category: 'elves', title: 'ELVES Carbon Road Bikes India | Cyclify', heading: 'ELVES Carbon Road Bikes', description: 'Shop ELVES carbon road bikes and frames in India with detailed specifications from Cyclify.' }
];

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
  page = page.replace(/<span class="page-heading">[\s\S]*?<\/span><div class="catalog-tools">/, '<h1 class="page-heading">' + escapeHtml(landing.heading) + '</h1><div class="catalog-tools">');
  page = page.replace(/let activeCategory=new URLSearchParams\(window\.location\.search\)\.get\("category"\)\|\|"";/, 'let activeCategory=new URLSearchParams(window.location.search).get("category")||' + JSON.stringify(landing.category) + ';');
  if (landing.sub) {
    page = page.replace(/let activeSubCategory=new URLSearchParams\(window\.location\.search\)\.get\("sub"\)\|\|"";/, 'let activeSubCategory=new URLSearchParams(window.location.search).get("sub")||' + JSON.stringify(landing.sub) + ';');
  }
  page = page.replace('<div class="category-strip"', '<p class="seo-landing-copy" style="margin:0;padding:14px 4%;color:#4b5563;font-size:15px;line-height:1.55">' + escapeHtml(landing.description) + '</p>\n<div class="category-strip"');
  fs.writeFileSync(path.join(root, landing.file), page, 'utf8');
});

const legacyRedirects = {
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
  fs.writeFileSync(destination, redirectPage(target, 'This Cyclify collection has moved.'), 'utf8');
});

const excludedPages = new Set(['product.html', 'account.html', 'cart.html']);
const seenCanonicals = new Set();
const staticPages = fs.readdirSync(root)
  .filter(file => file.endsWith('.html') && !excludedPages.has(file))
  .map(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (!/<meta name="robots" content="index,follow">/i.test(source)) return null;
    const canonical = source.match(/<link rel="canonical" href="([^"]+)">/i);
    if (!canonical || seenCanonicals.has(canonical[1])) return null;
    seenCanonicals.add(canonical[1]);
    return [canonical[1], canonical[1] === 'https://cyclify.in/' ? '1.0' : '0.9'];
  })
  .filter(Boolean);
const today = new Date().toISOString().slice(0, 10);
const urls = staticPages.concat(primaryProducts.map(product => ['https://cyclify.in/' + routes[product.id], '0.8']));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(([url, priority]) => '  <url><loc>' + url + '</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq><priority>' + priority + '</priority></url>').join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(sitemapPath, sitemap, 'utf8');

console.log('Generated ' + primaryProducts.length + ' canonical product pages, ' + landingPages.length + ' landing pages, redirects, and sitemap.');
console.log('Consolidated ' + (products.length - primaryProducts.length) + ' duplicate product records.');
