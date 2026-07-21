const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const root = path.resolve(__dirname, '..');
const sourceBase = 'https://www.fccracing.com';
const dataPath = path.join(root, 'assets', 'data', 'fcc-products.json');
const scriptPath = path.join(root, 'assets', 'js', 'fcc-products.js');
const selectedCollections = ['cyclami', 'xoss', 'ecoracer', 'ralson', 'toseek'];
const seedProductUrls = {
  cyclami: [
    'cyclami-mtb-tpu-inner-tube-anti-oxidation-lightweight-bicycle-tube', 'cyclami-tpu-bicycle-inner-tubes',
    'cyclami-cy200-smart-brake-sensor-tail-light', 'cyclami-1800-lumen-usb-rechargeable-bicycle-front-light',
    'cyclami-br-1200-bicycle-front-light', 'cyclami-br1000-super-bright-led-bicycle-headlight',
    'cyclami-br2000-bicycle-light', 'lumens-rechargeable-waterproof-bicycle-light-led-front-light',
    'cyclami-2200-lumen-led-bicycle-light-multi-function', 'cyclami-500-lumen-front-light',
    'cyclami-300-lumen-rechargeable-bike-front-light', 'Cyclami-1200-Lumen-High-Brightness-Bicycle-Light',
    'cyclami-a3-max-mini-electric-bike-pump', 'cyclami-q2-sup-electric-pump-',
    'cyclami-a2-max-150psi-mini-electric-bike-tire-pump', 'Cyclami-Electric-Air-Pump',
    'buy-cyclami-tubeless-bicycle-presta-valves', 'cyclami-carbon-fiber-derailleur-jockey-wheel-pulley-set',
    'bicycle-computer-holder-mount-', 'cyclami-m6w-3-in-1-bicycle-mount-for-gps-camera',
    's16-out-front-mount-bicycle-computer-holder', 'Carbon-Fiber-Bicycle-Computer-Holder-Cyclami',
    'Bicycle-Computer-Mount-Holder-Cyclami-S2', 'Cyclami-C1-Cadence-speed-Dual-Sensor-Bike-Computer-ANTBLE-50-Waterproof-GPS'
  ],
  xoss: [
    'xoss-arena-dual-speed-cadence-sensor-', 'xoss-vortex-speed-cadence-sensor',
    'xoss-x2-pro-heart-rate-monitor-sensor', 'xoss-x2-smart-heart-rate-sensor',
    'xoss-g3+-gen3-gps-bike-computer', 'xoss-nav-gps-case-screen-protector',
    'xoss-nav+-gps-bike-computer', 'xoss-nav-gps-bike-computer-', 'Xoss-G2-Bicycle-Gps-Computer'
  ],
  ecoracer: [
    'ecoracer-700-35', 'ecoracer-lite-foldable-tubeless-ready-training-tyre',
    'ecoracer-lite-foldable-tube', 'ecoracer-bicycle-tube-700x32-45c-',
    'ralson-ecoracer-bicycle-tube', 'ralson-ecoracer-bicycle-tube-',
    'ralson-ecoracer-lite-pro', 'ralson-ecoracer-lite-foldable-tube'
  ],
  ralson: [
    'ralson-700x38c-bicycle-tyre-hero-lectro-', 'ralson-rock-on-bicycle-tyre-', 'ralson-700-25c',
    'ralson-monde-700x32-antipuncture-road-tyre', 'ralson-700-35c-nonfoldble',
    'ralson-700x35-tyre-tube-combo', 'ralson-700x35-road-hybrid-tyre-tube-combo',
    'ralson-700x25-road-hybrid-tyre-tube-combo', 'foldable-700x35-road-hybrid-tyre-tube-combo',
    'ralson-700x28c-bicycle-tube-set-pack-of-2', 'ralson-700x35-butyl-bicycle-tube-schrader-valve',
    'ralson-700x35-tyre-tube-combo-set-of-2', 'ralson-700x28c-tyre-tube-combo',
    'ralson-vector-29', 'himalayan-trail-29', 'Ralson-Foldable-tyres', 'ralson-700-28c-combo'
  ],
  toseek: [
    'Toseek-Ultra-lightweight-Full-Carbon-Saddle', 'Toseek-Eva-leather-comfortable-Saddle',
    'Toseek-TS-50-Lightweight-Bicycle-Seat', 'toseek-full-carbon-relax-handlebar-tt-bar',
    'Toseek-carbon-stem', 'Toseek-Handlebar-Tape', 'Toseek-Bicycle-pedal',
    'Toseek-Carbon-Fiber-Bottle-Cage', 'Toseek-Full-Carbon-Integrated-Mtb-Handelbar',
    'TOSEEK-ZXB-TWO-Carbon-Road-Handlebar', 'Toseek-MTB-Carbon-Handlebar',
    'Toseek-3k-Carbon-Woave-Pu-Leather-Black-Road-Handelbar-Tape'
  ]
};

const existingHandleIds = {
  'cyclami-electric-air-pump': 5,
  'cyclami-c1-cadence-speed-dual-sensor-bike-computer-antble-50-waterproof-gps': 6,
  'buy-cyclami-tubeless-bicycle-presta-valves': 7,
  'cyclami-500-lumen-front-light': 8,
  'cyclami-br-1200-bicycle-front-light': 9,
  'lumens-rechargeable-waterproof-bicycle-light-led-front-light': 10,
  'carbon-fiber-bicycle-computer-holder-cyclami': 12,
  'cyclami-br2000-bicycle-light': 13,
  'bicycle-computer-mount-holder-cyclami-s2': 14,
  'bicycle-bottle-cage-anti-theft-gps-tracker': 15,
  's16-out-front-mount-bicycle-computer-holder': 16,
  'cyclami-m6w-3-in-1-bicycle-mount-for-gps-camera': 17,
  'cyclami-a3-max-mini-electric-bike-pump': 18,
  'bicycle-computer-holder-mount-': 19,
  'cyclami-cy200-smart-brake-sensor-tail-light': 20,
  'cyclami-q2-sup-electric-pump-': 21,
  'cyclami-br1000-super-bright-led-bicycle-headlight': 22,
  'cyclami-1200-lumen-high-brightness-bicycle-light': 23,
  'bicycle-rear-derailleur-jockey-wheel-13t17t': 24,
  'bicycle-tyre-opener-breaker-portable': 25,
  'cyclami-cy180-smart-bicycle-taillight-with-wireless-remote': 27,
  'cyclami-1800-lumen-usb-rechargeable-bicycle-front-light': 28,
  'cyclami-carbon-fiber-derailleur-jockey-wheel-pulley-set': 29,
  'cyclami-tpu-bicycle-inner-tubes': 30,
  'cyclami-2200-lumen-led-bicycle-light-multi-function': 33,
  'cyclami-mtb-tpu-inner-tube-anti-oxidation-lightweight-bicycle-tube': 34,
  'cyclami-a2-max-150psi-mini-electric-bike-tire-pump': 35,
  'toseek-zxb-two-carbon-road-handlebar': 61,
  'toseek-full-carbon-relax-handlebar-tt-bar': 62
};

const clean = value => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function parseNextData(html, url) {
  const $ = cheerio.load(html);
  const value = $('#__NEXT_DATA__').text();
  if (!value) throw new Error(`FCC page did not contain product data: ${url}`);
  return JSON.parse(value);
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
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1200));
  }
  throw new Error(`FCC returned HTTP ${lastStatus}: ${url}`);
}

async function collectionProductUrls(handle) {
  const links = new Set((seedProductUrls[handle] || []).map(slug => `${sourceBase}/product/${slug}`));
  for (let page = 1; page <= 10; page += 1) {
    const url = `${sourceBase}/collections/${handle}${page === 1 ? '' : `?page=${page}`}`;
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const before = links.size;
    $('a[href*="/product/"]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;
      const pathname = new URL(href, sourceBase).pathname;
      if (pathname.startsWith('/product/')) links.add(`${sourceBase}${pathname}`);
    });
    if (links.size === before || !/Pages\s+\d+\s+of\s+\d+/i.test(clean($('body').text()))) break;
  }
  return [...links];
}

function categoryFor(product) {
  const value = `${product.name} ${product.category?.name || ''}`.toLowerCase();
  const has = pattern => pattern.test(value);

  if (has(/mount|holder|computer case|screen protector/)) return { categoryPage: 'accessories.html', categoryLabel: 'Accessories', mainCategory: 'mounts-cases', subCategory: '' };
  if (has(/handlebar tape|bar tape/)) return { categoryPage: 'accessories.html', categoryLabel: 'Accessories', mainCategory: 'tapes', subCategory: '' };
  if (has(/bottle cage|water bottle/)) return { categoryPage: 'accessories.html', categoryLabel: 'Accessories', mainCategory: 'bottle-cages', subCategory: '' };
  if (has(/pedal|cleat/)) return { categoryPage: 'accessories.html', categoryLabel: 'Accessories', mainCategory: 'pedals-cleats', subCategory: '' };
  if (has(/air pump|electric pump|inflator/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'electric-pump', subCategory: '' };
  if (has(/wheelset|carbon wheel|alloy wheel/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'wheels', subCategory: has(/carbon/) ? 'carbon' : 'alloy' };
  if (has(/freehub/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'freehub-body', subCategory: '' };
  if (has(/\bhub\b/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'hubs', subCategory: '' };
  if (has(/tyre.*tube combo|tire.*tube combo/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'tyres', subCategory: '' };
  if (has(/inner tube|tpu tube|bicycle tube|tube set|butyl.*tube/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'tubes', subCategory: '' };
  if (has(/presta valve|tubeless valve/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'valve', subCategory: '' };
  if (has(/\btyre\b|\btire\b/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'tyres', subCategory: '' };

  if (has(/helmet/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'helmets', subCategory: '' };
  if (has(/cycling shoes|bicycle shoes|\bshoe\b/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'shoes', subCategory: '' };
  if (has(/eyewear|sunglass|glasses/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'eyewear', subCategory: '' };
  if (has(/glove/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'gloves', subCategory: '' };
  if (has(/jersey|bib short|cycling short|skinsuit|apparel/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'jersey-shorts', subCategory: '' };

  if (has(/cadence sensor|speed sensor|heart rate|\bsensor\b/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'sensors', subCategory: '' };
  if (has(/gps bike computer|bike computer|cycling computer/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'bike-computer', subCategory: '' };
  if (has(/smart trainer|bike trainer|home trainer/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'smart-trainer', subCategory: '' };
  if (has(/power meter/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'power-meter', subCategory: '' };
  if (has(/electric groupset|wireless groupset|electronic groupset/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'wireless-groupset', subCategory: '' };
  if (has(/front light|tail.?light|headlight|bicycle light|bike light|lumen/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'lights', subCategory: '' };

  if (has(/handlebar|handle bar|aero bar|tt bar|\bstem\b/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'cockpit', subCategory: has(/stem/) ? 'stems' : has(/aero bar|tt bar/) ? 'aerobars' : 'handlebars' };
  if (has(/cassette|chainring|\bchain\b|jockey|derailleur|crank|bottom bracket/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'drivetrain', subCategory: has(/cassette/) ? 'cassettes' : 'drivetrain-parts' };
  if (has(/torque wrench|repair tool|tyre lever|tire lever|\btool\b/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'maintenance', subCategory: 'tools' };
  if (has(/saddle|seatpost/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'cockpit', subCategory: 'saddles' };

  let accessory = 'other';
  if (has(/bag|storage/)) accessory = 'bags';
  return { categoryPage: 'accessories.html', categoryLabel: 'Accessories', mainCategory: accessory, subCategory: '' };
}

function inferBrand(product) {
  const name = clean(product.name);
  if (/^cyclami\b/i.test(name) || /\bcyclami\b/i.test(name)) return 'Cyclami';
  if (/^xoss\b/i.test(name)) return 'XOSS';
  if (/ecoracer/i.test(name)) return 'Ecoracer';
  if (/^ralson\b/i.test(name)) return 'Ralson';
  if (/^toseek\b/i.test(name)) return 'TOSEEK';
  const supplierBrand = clean(product.brand_name);
  return /^(accessories|bicycle accessories)$/i.test(supplierBrand) ? 'FCC Racing' : supplierBrand || 'FCC Racing';
}

function imageUrl(image) {
  if (!image) return '';
  return image.image_url || image.thumbnail_url || image.compressed_images?.original || '';
}

function productSpecs(product) {
  const $ = cheerio.load(product.description_detail || '');
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
  add('Brand', inferBrand(product));
  if (product.category?.name) add('Product Type', product.category.name);
  $('table tr').each((_, row) => {
    const cells = $(row).find('th,td').map((__, cell) => clean($(cell).text())).get().filter(Boolean);
    if (cells.length >= 2) add(cells[0], cells.slice(1).join(' / '));
  });
  $('p,li').each((_, node) => {
    const text = clean($(node).text());
    const parts = text.split(/\s*[•\n]\s*/).filter(Boolean);
    parts.forEach(part => {
      const match = part.match(/^([^:]{2,60}):\s*(.{1,280})$/);
      if (match) add(match[1], match[2]);
    });
  });
  add('Shipping', 'Free shipping across India');
  return specs.slice(0, 32);
}

function transform(product, sourceUrl) {
  const slug = new URL(sourceUrl).pathname.split('/').filter(Boolean).pop();
  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const variants = rawVariants.map(variant => ({
    id: Number(variant.variant_id || variant.id),
    title: clean(variant.variant_name || Object.values(variant.option_variant_names || {}).join(' / ') || 'Default Title'),
    available: Boolean(variant.available) && Number(variant.status ?? 1) !== 0,
    price: Number(variant.discounted_price || variant.price || product.discounted_price || product.price || 0),
    compare_at_price: Number(variant.price || product.price || 0),
    option1: clean(Object.values(variant.option_variant_names || {})[0]),
    option2: clean(Object.values(variant.option_variant_names || {})[1]),
    option3: clean(Object.values(variant.option_variant_names || {})[2])
  }));
  const visibleVariants = variants.filter(item => !/^default title$/i.test(item.title));
  const sizes = [...new Set(visibleVariants.map(item => item.title))];
  const sizeAvailability = Object.fromEntries(sizes.map(size => [size, visibleVariants.some(item => item.title === size && item.available)]));
  const images = (product.images || []).map(imageUrl).filter(Boolean);
  const productImage = product.image_url || product.thumbnail_url;
  if (productImage && !images.includes(productImage)) images.unshift(productImage);
  const discounted = Number(product.discounted_price || 0);
  const price = discounted > 0 ? discounted : Number(product.price || 0);
  const available = Number(product.is_active ?? 1) !== 0 && Number(product.available ?? 1) !== 0 && (!variants.length || variants.some(item => item.available));
  const category = categoryFor(product);
  const id = existingHandleIds[slug.toLowerCase()] || 200000000 + Number(product.id);

  return {
    id,
    supplierProductId: Number(product.id),
    supplierSynced: true,
    sourceHandle: slug,
    sourceUrl,
    stockSource: 'fcc',
    name: clean(product.name),
    brand: inferBrand(product),
    description: clean(product.description).slice(0, 900),
    price,
    mrp: `Rs ${Number(product.price || price).toLocaleString('en-IN')}`,
    image: images[0] || 'assets/Logo-dark-preview.png',
    images: images.length ? images : ['assets/Logo-dark-preview.png'],
    sizes,
    sizeAvailability,
    variants,
    available,
    specs: productSpecs(product),
    specSource: { label: 'Live supplier specification', url: sourceUrl },
    keywords: clean(`${product.name} ${product.category?.name || ''} ${product.brand_name || ''}`),
    ...category
  };
}

async function fetchProduct(url) {
  const html = await fetchText(url);
  const data = parseNextData(html, url);
  const product = data?.props?.pageProps?.product;
  if (!product) throw new Error(`FCC product record missing: ${url}`);
  return transform(product, url);
}

function writeIfChanged(file, content) {
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (previous === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

async function main() {
  const collectionResults = await Promise.all(selectedCollections.map(async handle => ({
    handle,
    urls: await collectionProductUrls(handle)
  })));
  const urls = [...new Set(collectionResults.flatMap(item => item.urls))];
  if (!urls.length) throw new Error('FCC collections returned no products; previous catalogue kept unchanged.');

  const previousProducts = fs.existsSync(dataPath)
    ? (JSON.parse(fs.readFileSync(dataPath, 'utf8')).products || [])
    : [];
  const previousByUrl = new Map(previousProducts.map(product => [product.sourceUrl, product]));
  const products = [];
  for (let index = 0; index < urls.length; index += 6) {
    const batch = urls.slice(index, index + 6);
    const results = await Promise.allSettled(batch.map(fetchProduct));
    results.forEach((result, resultIndex) => {
      const url = batch[resultIndex];
      if (result.status === 'fulfilled') {
        products.push(result.value);
        return;
      }
      const previous = previousByUrl.get(url);
      if (previous) {
        products.push({ ...previous, available: false });
        console.warn(`FCC product temporarily unavailable; previous details kept and marked out of stock: ${url}`);
      } else {
        console.warn(`FCC product skipped because its page is unavailable: ${url}`);
      }
    });
  }
  if (!products.length) throw new Error('FCC product pages returned no usable records; previous catalogue kept unchanged.');
  products.sort((a, b) => a.name.localeCompare(b.name));

  const duplicateIds = products.filter((item, index) => products.findIndex(other => other.id === item.id) !== index);
  if (duplicateIds.length) throw new Error(`Duplicate generated IDs: ${duplicateIds.map(item => item.id).join(', ')}`);

  const payload = { version: 1, source: sourceBase, selectedCollections, products };
  const json = JSON.stringify(payload, null, 2) + '\n';
  const runtime = `(function(){\n  const payload=${JSON.stringify(payload)};\n  window.CYCLIFY_FCC_PRODUCTS=payload.products;\n  window.cyclifyMergeFccProducts=function(target,page){\n    const normalise=value=>String(value||\"\").toLowerCase().replace(/[^a-z0-9]+/g,\"\");\n    payload.products.filter(item=>!page||item.categoryPage===page).forEach(item=>{\n      const existing=target.find(product=>product.id===item.id||product.sourceHandle===item.sourceHandle||normalise(product.name)===normalise(item.name));\n      if(existing){const id=existing.id;Object.assign(existing,item,{id});}\n      else{target.push({...item});}\n    });\n    return target;\n  };\n})();\n`;

  const dataChanged = writeIfChanged(dataPath, json);
  const scriptChanged = writeIfChanged(scriptPath, runtime);
  const changed = dataChanged || scriptChanged;
  const summary = Object.fromEntries(selectedCollections.map(handle => [handle, collectionResults.find(item => item.handle === handle).urls.length]));
  console.log(`FCC sync: ${products.length} products. Collections: ${JSON.stringify(summary)}. Changed: ${changed}.`);
}

main().catch(error => {
  console.error(`FCC sync failed safely: ${error.message}`);
  process.exitCode = 1;
});
