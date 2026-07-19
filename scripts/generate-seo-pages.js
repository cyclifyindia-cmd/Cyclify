const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'product.html');
const outputDir = path.join(root, 'products');
const routesPath = path.join(root, 'assets', 'js', 'product-routes.js');
const sitemapPath = path.join(root, 'sitemap.xml');
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

function descriptionFor(product) {
  const specs = (product.specs || []).slice(0, 3).join('. ');
  return ('Buy ' + product.name + ' online from Cyclify India for Rs ' + Number(product.price).toLocaleString('en-IN') + '. ' + specs)
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

const products = extractProducts(template);
const routes = Object.fromEntries(products.map(product => [product.id, 'products/' + slugify(product.name) + '-' + product.id + '.html']));

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.dirname(routesPath), { recursive: true });
fs.writeFileSync(
  routesPath,
  '(function(){\n  const routes=' + JSON.stringify(routes, null, 2) + ';\n  window.CYCLIFY_PRODUCT_ROUTES=routes;\n  window.cyclifyProductUrl=function(id){return routes[id]||("product.html?id="+encodeURIComponent(id));};\n})();\n',
  'utf8'
);

for (const product of products) {
  const route = routes[product.id];
  const canonical = 'https://cyclify.in/' + route;
  const title = product.name + ' Price and Specifications | Cyclify';
  const description = descriptionFor(product);
  const image = absoluteUrl(product.image || (product.images || [])[0] || 'assets/Logo-dark-preview.png');
  const inferredBrand = (product.name.match(/^(SAVA|ELVES|Cyclami|ThinkRider|Orome|iGPSPORT|MET|Cairbull|ELSIER|RIRO|TOSEEK)/i) || ['Cyclify'])[0];
  const brand = product.id === 16 ? 'Cyclami' : inferredBrand;
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
        offers: {
          '@type': 'Offer',
          url: canonical,
          priceCurrency: 'INR',
          price: String(product.price),
          availability: 'https://schema.org/InStock',
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
const urls = staticPages.concat(products.map(product => ['https://cyclify.in/' + routes[product.id], '0.8']));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(([url, priority]) => '  <url><loc>' + url + '</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq><priority>' + priority + '</priority></url>').join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(sitemapPath, sitemap, 'utf8');

console.log('Generated ' + products.length + ' SEO product pages, product routes, and sitemap.');
