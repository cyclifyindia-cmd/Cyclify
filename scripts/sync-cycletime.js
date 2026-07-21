const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const root = 'C:/Users/user/Documents/GitHub/Cyclify';
const sourceBase = 'https://www.cycletimeindia.com';
const dataPath = path.join(root, 'assets/data/cycletime-products.json');
const scriptPath = path.join(root, 'assets/js/supplier-products.js');

const existingHandleIds = {
  'orome-valar-th50d-carbon-road-disc-brake-wheelsets-disc-brake-carbon-wheels-superlight-carbon-disc-brake-wheelsets': 37,
  'elsier-road-cycling-shoes': 48,
  'cairbull-venger-cycling-helmet': 49,
  'met-trenta-mips-road-cycling-helmet-black-red-metallic-matt-glossy': 50,
  'met-trenta-3k-carbon-mips-road-cycling-helmet-gray-iridescent': 51,
  'cairbull-terrain-mtb-helmet': 52,
  'cairbull-slk20-cycling-helmet': 53,
  'igpsports-bsc200s': 41,
  'igpsport-bsc100max-lightweight-large-screen-smart-bike-computer-sleek-to-the-edge-ride-with-ease': 42,
  'igpsports-bsc300t': 44,
  'igpsport-binavi-air-light-is-might-computer': 45,
  'igpsports-binavi': 47
};

function repairMojibake(value) {
  const text = String(value || '');
  if (!/[\u00c2\u00c3\u00e2\u00f0]/.test(text)) return text;
  const repaired = iconv.decode(iconv.encode(text, 'windows-1252'), 'utf8');
  return repaired.includes('\ufffd') ? text : repaired;
}

const clean = value => repairMojibake(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function inferBrand(product) {
  const generic = /^(CycleTimeIndia|Royal Traders)$/i;
  if (product.vendor && !generic.test(product.vendor)) return clean(product.vendor);
  const known = ['iGPSPORT', 'ELVES', 'OROME', 'Elsier', 'Cairbull', 'MET', 'Aerodoc', 'Elite', 'UNO', 'Shimano', 'FSA', 'KMC', 'GUB'];
  return known.find(brand => product.title.toLowerCase().startsWith(brand.toLowerCase())) || clean(product.vendor) || 'CycleTimeIndia';
}

function categoryFor(product) {
  const value = `${product.title} ${product.product_type || ''} ${product.tags || ''}`.toLowerCase();
  const has = pattern => pattern.test(value);

  if (has(/frame|frameset/)) return { categoryPage: 'bikes-frames.html', categoryLabel: 'Bikes & Frames', mainCategory: inferBrand(product).toLowerCase().includes('elves') ? 'elves' : 'sava', subCategory: 'framesets' };
  if (has(/wheelset|bicycle wheels|carbon wheels|alloy wheels/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'wheels', subCategory: has(/carbon/) ? 'carbon' : 'alloy' };
  if (has(/freehub/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'freehub-body', subCategory: '' };
  if (has(/\bhub\b/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'hubs', subCategory: '' };
  if (has(/valve extender|tubeless valve|presta valve/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'valve', subCategory: '' };
  if (has(/inner tube|bicycle tube|\btpu tube\b/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'tubes', subCategory: '' };
  if (has(/\btyre\b|\btire\b|bicycle tire/)) return { categoryPage: 'wheels-tyres.html', categoryLabel: 'Wheels & Tyres', mainCategory: 'tyres', subCategory: '' };

  if (has(/helmet/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'helmets', subCategory: '' };
  if (has(/cycling shoes|bicycle shoes|\bshoe\b/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'shoes', subCategory: '' };
  if (has(/smart watch/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'smart-watches', subCategory: '' };
  if (has(/eyewear|sunglass|glasses/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'eyewear', subCategory: '' };
  if (has(/glove/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'gloves', subCategory: '' };
  if (has(/jersey|bib short|cycling short|skinsuit|skin suit|triathlon|\bcloth\b|apparel/)) return { categoryPage: 'wearables.html', categoryLabel: 'Wearables', mainCategory: 'jersey-shorts', subCategory: '' };

  if (has(/smart trainer|home trainer|bicycle roller|bike trainer|\btrainer\b/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'smart-trainer', subCategory: '' };
  if (has(/power meter/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'power-meter', subCategory: '' };
  if (has(/electric groupset|wireless groupset|electronic groupset/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'wireless-groupset', subCategory: '' };
  if (has(/smart light|front light|tail.?light|headlight|bicycle smart lights|bike light/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'lights', subCategory: '' };
  if (has(/air pump|electric pump|inflator/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'electric-pump', subCategory: '' };
  if (has(/cadence sensor|speed sensor|heart rate|\bsensor\b/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'sensors', subCategory: '' };
  if (has(/cyclocomputer|gps computer|bike computer(?! mount| case)|cycling computer/)) return { categoryPage: 'electronics.html', categoryLabel: 'Electronics', mainCategory: 'bike-computer', subCategory: '' };

  if (has(/handlebar|handle bar|\bstem\b/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'cockpit', subCategory: has(/stem/) ? 'stems' : 'handlebars' };
  if (has(/cassette|chainring|\bchain\b|jockey|derailleur|crank|track cog|bottom bracket|gear mech/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'drivetrain', subCategory: has(/cassette/) ? 'cassettes' : 'drivetrain-parts' };
  if (has(/torque wrench|repair tool|\btool\b|roller belt/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'maintenance', subCategory: 'tools' };
  if (has(/saddle|seatpost/)) return { categoryPage: 'components.html', categoryLabel: 'Components', mainCategory: 'cockpit', subCategory: 'saddles' };

  let accessory = 'other';
  if (has(/mount|computer case|protective case|tempered film/)) accessory = 'mounts-cases';
  else if (has(/bag|storage/)) accessory = 'bags';
  else if (has(/bottle cage|water bottle/)) accessory = 'bottle-cages';
  else if (has(/pedal|cleat/)) accessory = 'pedals-cleats';
  else if (has(/handlebar tape|bar tape/)) accessory = 'tapes';
  return { categoryPage: 'accessories.html', categoryLabel: 'Accessories', mainCategory: accessory, subCategory: '' };
}

function extractSpecs(product) {
  const $ = cheerio.load(product.body_html || '');
  const specs = [];
  const seen = new Set();
  const add = (label, value) => {
    label = clean(label).replace(/:$/, '');
    value = clean(value);
    if (!label || !value || label.length > 55 || value.length > 260) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    specs.push(`${label} : ${value}`);
  };

  add('Brand', inferBrand(product));
  if (product.product_type) add('Product Type', product.product_type);

  $('table tr').each((_, row) => {
    const cells = $(row).find('th,td').map((__, cell) => clean($(cell).text())).get().filter(Boolean);
    if (cells.length >= 2) add(cells[0], cells.slice(1).join(' / '));
  });

  $('li,p').each((_, node) => {
    const text = clean($(node).text());
    const match = text.match(/^([^:–-]{2,55})\s*[:–-]\s*(.{2,260})$/);
    if (match) add(match[1], match[2]);
  });

  (product.options || []).forEach(option => {
    if (!option.name || /^title$/i.test(option.name)) return;
    add(`${option.name} Options`, (option.values || []).join(', '));
  });

  const description = clean($.root().text());
  if (specs.length < 4 && description) add('Product Details', description.slice(0, 240));
  add('Shipping', 'Free shipping across India');
  return specs.slice(0, 30);
}

function toMoney(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function transform(product) {
  const category = categoryFor(product);
  const variants = (product.variants || []).map(variant => ({
    id: variant.id,
    title: clean(variant.title),
    available: Boolean(variant.available),
    price: toMoney(variant.price),
    compare_at_price: toMoney(variant.compare_at_price),
    option1: clean(variant.option1),
    option2: clean(variant.option2),
    option3: clean(variant.option3)
  }));
  const prices = variants.map(item => item.price).filter(value => value > 0);
  const compares = variants.map(item => item.compare_at_price).filter(value => value > 0);
  const variantTitles = variants.map(item => item.title).filter(title => title && !/^default title$/i.test(title));
  const sizes = [...new Set(variantTitles)];
  const sizeAvailability = Object.fromEntries(sizes.map(size => [size, variants.some(variant => variant.title === size && variant.available)]));
  const images = (product.images || []).map(image => image.src || image).filter(Boolean);
  const price = prices.length ? Math.min(...prices) : 0;
  const compare = compares.length ? Math.max(...compares) : price;
  const sourceUrl = `${sourceBase}/products/${product.handle}`;
  const $ = cheerio.load(product.body_html || '');
  const description = clean($.root().text()).slice(0, 650);

  return {
    id: existingHandleIds[product.handle] || Number(product.id),
    supplierProductId: Number(product.id),
    supplierSynced: true,
    sourceHandle: product.handle,
    sourceUrl,
    stockSource: 'cycletime',
    name: clean(product.title),
    brand: inferBrand(product),
    description,
    price,
    mrp: `Rs ${compare.toLocaleString('en-IN')}`,
    image: images[0] || 'assets/Logo-dark-preview.png',
    images: images.length ? images : ['assets/Logo-dark-preview.png'],
    sizes,
    sizeAvailability,
    variants,
    available: variants.some(variant => variant.available),
    specs: extractSpecs(product),
    specSource: { label: 'Live supplier specification', url: sourceUrl },
    keywords: clean(`${product.title} ${product.product_type || ''} ${product.vendor || ''}`),
    ...category
  };
}

async function fetchCatalogue() {
  const all = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${sourceBase}/products.json?limit=250&page=${page}`, {
      headers: { 'user-agent': 'Cyclify Supplier Sync/1.0' }
    });
    if (!response.ok) throw new Error(`Cycle Time feed returned HTTP ${response.status}`);
    const data = await response.json();
    const products = data.products || [];
    all.push(...products);
    if (products.length < 250) break;
  }
  if (!all.length) throw new Error('Cycle Time feed returned no products; previous catalogue kept unchanged.');
  return all;
}

function writeIfChanged(file, content) {
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (previous === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

async function main() {
  const raw = await fetchCatalogue();
  const products = raw.map(transform).sort((a, b) => a.name.localeCompare(b.name));
  const duplicateIds = products.filter((item, index) => products.findIndex(other => other.id === item.id) !== index);
  if (duplicateIds.length) throw new Error(`Duplicate generated IDs: ${duplicateIds.map(item => item.id).join(', ')}`);

  const payload = { version: 1, source: sourceBase, products };
  const json = JSON.stringify(payload, null, 2) + '\n';
  const runtime = `(function(){\n  const payload=${JSON.stringify(payload)};\n  window.CYCLIFY_CYCLETIME_PRODUCTS=payload.products;\n  window.cyclifyMergeSupplierProducts=function(target,page){\n    const normalise=value=>String(value||\"\").toLowerCase().replace(/[^a-z0-9]+/g,\"\");\n    payload.products.filter(item=>!page||item.categoryPage===page).forEach(item=>{\n      const existing=target.find(product=>product.id===item.id||product.sourceHandle===item.sourceHandle||normalise(product.name)===normalise(item.name));\n      if(existing){const id=existing.id;Object.assign(existing,item,{id});}\n      else{target.push({...item});}\n    });\n    return target;\n  };\n})();\n`;

  const dataChanged = writeIfChanged(dataPath, json);
  const scriptChanged = writeIfChanged(scriptPath, runtime);
  const available = products.filter(item => item.available).length;
  console.log(`Cycle Time sync: ${products.length} products, ${available} available, ${products.length - available} out of stock. Changed: ${dataChanged || scriptChanged}.`);
}

main().catch(error => {
  console.error(`Cycle Time sync failed safely: ${error.message}`);
  process.exitCode = 1;
});
