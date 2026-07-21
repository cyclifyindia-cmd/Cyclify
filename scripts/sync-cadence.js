const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const root = path.resolve(__dirname, '..');
const sourceBase = 'https://www.cadencelife.in';
const catalogueUrl = `${sourceBase}/products`;
const catalogueApiUrl = `${sourceBase}/store/products/listing?page=1&limit=10000`;
const dataPath = path.join(root, 'assets', 'data', 'cadence-products.json');
const scriptPath = path.join(root, 'assets', 'js', 'cadence-products.js');
const protectedBrands = ['xoss', 'cyclami', 'thinkrider'];

const clean = value => String(value || '')
  .replace(/\u00e2\u20ac[\u201c\u201d]/g, '-')
  .replace(/\u00e2\u20ac\u2122/g, "'")
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\u00c2/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalise = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '');

function isProtectedProduct(product) {
  const brand = normalise(product.brand);
  const name = normalise(product.name);
  return protectedBrands.some(item => brand.includes(item) || name.includes(item));
}

async function fetchText(url) {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'Cyclify Supplier Sync/1.0'
      }
    });
    if (response.ok) return response.text();
    lastStatus = response.status;
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000));
  }
  throw new Error(`Cadence Life returned HTTP ${lastStatus}: ${url}`);
}

function productUrlsFromCatalogue(html) {
  const $ = cheerio.load(html);
  const urls = new Set();
  $('a[href*="/products/"]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    const url = new URL(href, sourceBase);
    if (/^\/products\/[^/]+\/?$/.test(url.pathname)) {
      urls.add(`${sourceBase}${url.pathname.replace(/\/$/, '')}`);
    }
  });
  return [...urls];
}

function findProductSchema(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProductSchema(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.some(type => String(type).toLowerCase() === 'product')) return value;
  return findProductSchema(value['@graph']);
}

function parseProductSchema($) {
  let schema = null;
  $('script[type="application/ld+json"]').each((_, element) => {
    if (schema) return;
    try {
      schema = findProductSchema(JSON.parse($(element).text()));
    } catch (error) {
      // Ignore unrelated malformed structured data.
    }
  });
  return schema;
}

function parseMoney(value) {
  const match = clean(value).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Math.round(Number(match[0])) : 0;
}

function stableId(handle) {
  let hash = 2166136261;
  for (const char of handle) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 800000000 + ((hash >>> 0) % 100000000);
}

function categoryFor(product) {
  const value = `${product.name} ${product.description || ''} ${(product.specs || []).join(' ')}`.toLowerCase();
  const has = pattern => pattern.test(value);

  if (has(/helmet/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'helmets', subCategory: '' };
  if (has(/glove/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'gloves', subCategory: '' };
  if (has(/sunglass|eyewear|cycling glasses/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'eyewear', subCategory: '' };
  if (has(/cycling shoe|shoe cover|overshoe/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'shoes', subCategory: '' };
  if (has(/smart watch|fitness band/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'smart-watches', subCategory: '' };
  if (has(/jersey|bib short|cycling short|skinsuit|base layer|sock|cycling cap|wind vest|apparel/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'jersey-shorts', subCategory: '' };

  if (has(/bike computer|gps computer|cycling computer/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'bike-computer', subCategory: '' };
  if (has(/cadence sensor|speed sensor|heart rate|sensor/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'sensors', subCategory: '' };
  if (has(/front light|tail.?light|headlight|bike light|bicycle light|lumen/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'lights', subCategory: '' };
  if (has(/electric pump|air pump|inflator/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'electric-pump', subCategory: '' };
  if (has(/power meter/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'power-meter', subCategory: '' };

  if (has(/inner tube|tpu tube|bicycle tube/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'tubes', subCategory: '' };
  if (has(/tubeless valve|presta valve/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'valve', subCategory: '' };
  if (has(/\btyre\b|\btire\b/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'tyres', subCategory: '' };

  if (has(/cassette|chainring|jockey|pulley|derailleur|crank|bottom bracket|\bchain\b/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'drivetrain', subCategory: has(/cassette/) ? 'cassettes' : 'drivetrain-parts' };
  if (has(/handlebar|\bstem\b|saddle|seatpost/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'cockpit', subCategory: has(/saddle/) ? 'saddles' : has(/stem/) ? 'stems' : 'handlebars' };
  if (has(/tool|lever|repair|wrench/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'maintenance', subCategory: 'tools' };

  let mainCategory = 'other';
  if (has(/bag|hydration vest|waist belt|storage/)) mainCategory = 'bags';
  else if (has(/mount|holder|case/)) mainCategory = 'mounts-cases';
  else if (has(/bottle cage|water bottle/)) mainCategory = 'bottle-cages';
  else if (has(/pedal|cleat/)) mainCategory = 'pedals-cleats';
  else if (has(/handlebar tape|bar tape/)) mainCategory = 'tapes';
  return { categoryPage: 'accessories.html', categoryLabel: 'Accessories', mainCategory, subCategory: '' };
}

function extractSpecs($, schema, brand) {
  const specs = [];
  const seen = new Set();
  const add = (label, value) => {
    label = clean(label).replace(/:$/, '');
    value = clean(value);
    if (!label || !value || label.length > 60 || value.length > 280) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    specs.push(`${label} : ${value}`);
  };
  add('Brand', brand);
  $('[data-tab-content="specifications"] div').each((_, row) => {
    const spans = $(row).children('span').map((__, span) => clean($(span).text())).get().filter(Boolean);
    if (spans.length >= 2) add(spans[0], spans.slice(1).join(' / '));
  });
  if (specs.length < 3) {
    $('[data-tab-content="description"] li, [data-tab-content="description"] p').each((_, node) => {
      const text = clean($(node).text());
      const match = text.match(/^([^:]{2,60}):\s*(.{2,280})$/);
      if (match) add(match[1], match[2]);
    });
  }
  if (schema.category) add('Product Type', schema.category);
  add('Shipping', 'Free shipping across India');
  return specs.slice(0, 32);
}

function specificationValue($, wantedLabel) {
  let value = '';
  $('[data-tab-content="specifications"] div').each((_, row) => {
    if (value) return;
    const spans = $(row).children('span').map((__, span) => clean($(span).text())).get().filter(Boolean);
    if (spans.length >= 2 && normalise(spans[0]) === normalise(wantedLabel)) value = spans.slice(1).join(' / ');
  });
  return value;
}

function inferBrand($, schema) {
  const supplied = clean(typeof schema.brand === 'string' ? schema.brand : schema.brand?.name);
  if (supplied) return supplied;
  const specified = specificationValue($, 'Brand');
  if (specified) return specified;
  const known = clean(schema.name).match(/^(MCYCLE|X-TIGER|CYCPLUS|Riderace|GOB)\b/i);
  return known ? known[1] : 'Cadence Life';
}

function extractOptions($, handle, basePrice) {
  const options = [];
  $('button[data-option-title-key][data-option-title]').each((_, element) => {
    const key = clean($(element).attr('data-option-title-key'));
    const title = clean($(element).attr('data-option-title'));
    if (!key || !title) return;
    const stock = Number($(element).attr('data-option-stock') || 0);
    const inStock = String($(element).attr('data-option-in-stock')).toLowerCase() === 'true';
    const available = !$(element).is(':disabled') && (inStock || stock > 0);
    options.push({ key, title, available });
  });
  const sizeOptions = options.filter(option => /size/i.test(option.key));
  const displayed = sizeOptions.length ? sizeOptions : options.filter(option => !/color|colour/i.test(option.key));
  const unique = [...new Map(displayed.map(option => [option.title, option])).values()];
  const sizes = unique.map(option => option.title);
  const sizeAvailability = Object.fromEntries(unique.map(option => [option.title, option.available]));
  const variants = unique.map(option => ({
    id: stableId(`${handle}-${option.key}-${option.title}`),
    title: option.title,
    available: option.available,
    price: basePrice,
    compare_at_price: basePrice,
    option1: option.title,
    option2: '',
    option3: ''
  }));
  return { options, sizes, sizeAvailability, variants };
}

function transform(html, sourceUrl, previousByHandle) {
  const $ = cheerio.load(html);
  const schema = parseProductSchema($);
  if (!schema || !schema.name) throw new Error(`Product structured data missing: ${sourceUrl}`);
  const handle = new URL(sourceUrl).pathname.split('/').filter(Boolean).pop();
  const offer = Array.isArray(schema.offers) ? schema.offers[0] : (schema.offers || {});
  const brand = inferBrand($, schema);
  const description = clean(schema.description || $('[data-tab-content="description"]').text()).slice(0, 900);
  const price = parseMoney(offer.price || $('[data-product-price-main]').first().text() || $('[data-product-price]').first().text());
  const originalPrice = parseMoney($('[data-product-original-price]').first().text()) || price;
  const images = [...new Set((Array.isArray(schema.image) ? schema.image : [schema.image]).map(item => typeof item === 'string' ? item : item?.url).filter(Boolean))];
  const specs = extractSpecs($, schema, brand);
  const optionData = extractOptions($, handle, price);
  const schemaAvailable = /instock/i.test(String(offer.availability || ''));
  const available = optionData.options.length ? optionData.options.some(option => option.available) : schemaAvailable;
  const previous = previousByHandle.get(handle);
  const sourceProductId = (html.match(/__XPRESS_PRODUCT_ID\s*=\s*["']([^"']+)/) || [])[1] || handle;
  const base = {
    id: previous?.id || stableId(handle),
    supplierProductId: sourceProductId,
    supplierSynced: true,
    sourceHandle: handle,
    sourceUrl,
    stockSource: 'cadencelife',
    name: clean(schema.name),
    brand,
    description,
    price,
    mrp: `Rs ${originalPrice.toLocaleString('en-IN')}`,
    image: images[0] || 'assets/Logo-dark-preview.png',
    images: images.length ? images : ['assets/Logo-dark-preview.png'],
    sizes: optionData.sizes,
    sizeAvailability: optionData.sizeAvailability,
    variants: optionData.variants,
    available,
    specs,
    specSource: { label: 'Live supplier specification', url: sourceUrl },
    keywords: clean(`${schema.name} ${brand} ${schema.category || ''}`)
  };
  return { ...base, ...categoryFor(base) };
}

function writeIfChanged(file, content) {
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (previous === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

async function main() {
  let urls = [];
  try {
    const listing = JSON.parse(await fetchText(catalogueApiUrl));
    urls = [...new Set((listing.products || [])
      .map(product => clean(product.slug))
      .filter(Boolean)
      .map(slug => `${sourceBase}/products/${slug}`))];
  } catch (error) {
    const catalogueHtml = await fetchText(catalogueUrl);
    urls = productUrlsFromCatalogue(catalogueHtml);
  }
  if (!urls.length) throw new Error('Cadence Life catalogue returned no products; previous catalogue kept unchanged.');
  const previousProducts = fs.existsSync(dataPath) ? (JSON.parse(fs.readFileSync(dataPath, 'utf8')).products || []) : [];
  const previousByHandle = new Map(previousProducts.map(product => [product.sourceHandle, product]));
  const products = [];
  for (let index = 0; index < urls.length; index += 6) {
    const batch = urls.slice(index, index + 6);
    const results = await Promise.allSettled(batch.map(async url => transform(await fetchText(url), url, previousByHandle)));
    results.forEach((result, resultIndex) => {
      const url = batch[resultIndex];
      if (result.status === 'fulfilled') {
        if (!isProtectedProduct(result.value)) products.push(result.value);
        return;
      }
      const handle = new URL(url).pathname.split('/').filter(Boolean).pop();
      const previous = previousByHandle.get(handle);
      if (previous && !isProtectedProduct(previous)) {
        products.push({ ...previous, available: false });
        console.warn(`Cadence Life product temporarily unavailable; previous details kept and marked out of stock: ${url}`);
      } else {
        console.warn(`Cadence Life product skipped because its page is unavailable: ${url}`);
      }
    });
  }
  if (!products.length) throw new Error('Cadence Life product pages returned no permitted records; previous catalogue kept unchanged.');
  products.sort((a, b) => a.name.localeCompare(b.name));
  const duplicateIds = products.filter((item, index) => products.findIndex(other => other.id === item.id) !== index);
  if (duplicateIds.length) throw new Error(`Duplicate generated IDs: ${duplicateIds.map(item => item.id).join(', ')}`);
  const protectedMatches = products.filter(isProtectedProduct);
  if (protectedMatches.length) throw new Error(`Protected brands entered the Cadence feed: ${protectedMatches.map(item => item.name).join(', ')}`);

  const payload = { version: 1, source: sourceBase, excludedBrands: ['XOSS', 'Cyclami', 'ThinkRider'], products };
  const json = JSON.stringify(payload, null, 2) + '\n';
  const runtime = `(function(){\n  const payload=${JSON.stringify(payload)};\n  const protectedBrands=["xoss","cyclami","thinkrider"];\n  const normalise=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"");\n  const permitted=item=>!protectedBrands.some(brand=>normalise(item.brand).includes(brand)||normalise(item.name).includes(brand));\n  window.CYCLIFY_CADENCE_PRODUCTS=payload.products.filter(permitted);\n  window.cyclifyMergeCadenceProducts=function(target,page){\n    window.CYCLIFY_CADENCE_PRODUCTS.filter(item=>!page||item.categoryPage===page).forEach(item=>{\n      const existing=target.find(product=>product.id===item.id||product.sourceHandle===item.sourceHandle||normalise(product.name)===normalise(item.name));\n      if(existing){const id=existing.id;Object.assign(existing,item,{id});}\n      else{target.push({...item});}\n    });\n    return target;\n  };\n})();\n`;
  const dataChanged = writeIfChanged(dataPath, json);
  const scriptChanged = writeIfChanged(scriptPath, runtime);
  const changed = dataChanged || scriptChanged;
  console.log(`Cadence Life sync: ${urls.length} discovered, ${products.length} imported, ${urls.length - products.length} excluded or unavailable. Changed: ${changed}.`);
}

main().catch(error => {
  console.error(`Cadence Life sync failed safely: ${error.message}`);
  process.exitCode = 1;
});
