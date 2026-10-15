'use strict';
// Technical readiness is not evidence that Google has indexed or ranked a URL.
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const root = path.resolve(__dirname, '..');
const origin = 'https://cyclify.in';
const live = process.argv.includes('--live');
const gallery = process.argv.includes('--gallery');
const imageChecks = new Map();
const output = process.argv.find(arg => arg.startsWith('--report='))?.slice(9);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const clean = text => String(text || '').replace(/\s+/g, ' ').trim();
const xml = cheerio.load(read('sitemap.xml'), { xmlMode: true });
const urls = xml('url > loc').toArray().map(el => xml(el).text());
const feed = cheerio.load(read('google-merchant-feed.xml'), { xmlMode: true });
const items = new Map(feed('item').toArray().map(el => {
  const $item = feed(el);
  const value = tag => $item.children().filter((_, node) => node.name === tag).text();
  return [value('link'), { name: value('title'), image: value('g:image_link'),
    price: parseFloat(value('g:sale_price') || value('g:price')), availability: value('g:availability') }];
}));
const documents = new Map();
const edges = new Map();
const incoming = new Map();
function normalise(value, base) {
  const url = new URL(value, base);
  if (url.origin !== origin) return null;
  url.hash = ''; url.search = '';
  if (url.pathname === '/index.html') url.pathname = '/';
  return url.href;
}
for (const url of urls) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const local = pathname === '/' ? 'index.html' : pathname.slice(1) + (pathname.endsWith('/') ? 'index.html' : '');
  const $ = cheerio.load(read(local));
  documents.set(url, $);
  const base = new URL($('base').attr('href') || url, url).href;
  const links = new Set();
  $('a[href]').each((_, el) => {
    if (/\bnofollow\b/i.test($(el).attr('rel') || '') || $(el).parents('noscript').length) return;
    try {
      const target = normalise($(el).attr('href'), base);
      if (target && target !== url) {
        links.add(target);
        if (!incoming.has(target)) incoming.set(target, new Set());
        incoming.get(target).add(url);
      }
    } catch {}
  });
  edges.set(url, links);
}
const depths = new Map([[origin + '/', 0]]);
const queue = [origin + '/'];
while (queue.length) {
  const url = queue.shift();
  for (const target of edges.get(url) || []) {
    if (!documents.has(target) || depths.has(target)) continue;
    depths.set(target, depths.get(url) + 1); queue.push(target);
  }
}
function inspect(url, $, response) {
  const issues = [];
  if (response && response.status !== 200) issues.push('HTTP ' + response.status);
  if (response && response.url !== url) issues.push('Unexpected redirect: ' + response.url);
  if (/noindex|none/i.test(($('meta[name="robots"]').attr('content') || '') + ' ' + (response?.headers.get('x-robots-tag') || ''))) issues.push('Indexing blocked');
  if ($('link[rel="canonical"]').attr('href') !== url) issues.push('Canonical mismatch');
  const entities = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { const data = JSON.parse($(el).html()); entities.push(...(data['@graph'] || (Array.isArray(data) ? data : [data]))); }
    catch { issues.push('Invalid structured data'); }
  });
  const product = entities.find(entity => entity['@type'] === 'Product');
  const item = items.get(url);
  if (!product) issues.push('Missing product structured data');
  if (!item) issues.push('Missing Merchant feed entry');
  const hero = $('#productImage').attr('src');
  if (!hero || !$('#productImage').attr('alt')) issues.push('Missing primary image or alternative text');
  const schemaImage = Array.isArray(product?.image) ? product.image[0] : product?.image;
  if (item && [schemaImage, hero, $('meta[property="og:image"]').attr('content')].some(image => image !== item.image)) issues.push('Conflicting product image signals');
  if (item && product?.offers) {
    if (Number(product.offers.price) !== item.price) issues.push('Structured price differs from feed');
    const availability = String(product.offers.availability || '').split('/').pop();
    if (({ InStock: 'in_stock', OutOfStock: 'out_of_stock', PreOrder: 'preorder' })[availability] !== item.availability) issues.push('Structured stock differs from feed');
  }
  if (!depths.has(url)) issues.push('Not reachable from homepage through initial HTML links');
  if (!$('#productName').text().trim() || !$('#productPrice').text().trim()) issues.push('Missing initial product name or price');
  return { name: clean($('#productName').text()), url, price: item?.price, stock: item?.availability,
    title: clean($('title').text()), description: $('meta[name="description"]').attr('content'),
    homepageLinkDepth: depths.get(url) ?? null, referringPages: [...(incoming.get(url) || [])],
    image: item?.image, galleryImages: Array.isArray(product?.image) ? product.image : [product?.image].filter(Boolean), issues, googleIndexStatus: 'Not individually verified' };
}
async function request(url) {
  return fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'Cache-Control': 'no-cache' } });
}
async function checkGalleryImage(url) {
  if (!imageChecks.has(url)) imageChecks.set(url, (async () => {
    if (!live && url.startsWith(origin + '/')) {
      return fs.existsSync(path.join(root, decodeURIComponent(new URL(url).pathname).slice(1))) ? null : 'Missing local gallery image';
    }
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
      return response.status === 200 && /^image\//i.test(response.headers.get('content-type') || '') ? null : 'Gallery image HTTP ' + response.status;
    } catch (error) { return 'Gallery image request: ' + error.message; }
  })());
  return imageChecks.get(url);
}
async function main() {
  const products = [];
  const pending = urls.filter(url => new URL(url).pathname.startsWith('/products/'));
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length) {
      const url = pending.shift();
      try {
        const response = live ? await request(url) : null;
        const $ = response ? cheerio.load(await response.text()) : documents.get(url);
        const result = inspect(url, $, response);
        if (gallery) {
          result.galleryIssues = [];
          for (const imageUrl of result.galleryImages) {
            const issue = await checkGalleryImage(imageUrl);
            if (issue) result.galleryIssues.push({ url: imageUrl, issue });
          }
          if (result.galleryIssues.length) result.issues.push(result.galleryIssues.length + ' inaccessible gallery images');
        }
        if (live && result.image) {
          const image = await request(result.image);
          const bytes = Buffer.from(await image.arrayBuffer());
          result.imageHttp = image.status;
          result.imageType = image.headers.get('content-type');
          result.imageBytes = bytes.length;
          const raster = bytes.subarray(0, 3).equals(Buffer.from([255,216,255])) || bytes.subarray(1,4).toString() === 'PNG' || bytes.subarray(0,3).toString() === 'GIF' || (bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP');
          if (image.status !== 200 || !raster || !/^image\//i.test(result.imageType || '') || bytes.length < 100) result.issues.push('Primary image inaccessible or not a raster image');
          if (/noindex|none/i.test(image.headers.get('x-robots-tag') || '')) result.issues.push('Primary image indexing blocked');
        }
        products.push(result);
      } catch (error) { products.push({ url, issues: [error.message], googleIndexStatus: 'Not individually verified' }); }
    }
  }));
  products.sort((a,b) => a.url.localeCompare(b.url));
  const report = { checkedAt: new Date().toISOString(), mode: live ? 'Live pages and primary images' : 'Local generated pages',
    note: 'Technical readiness does not confirm Google indexing, approval or ranking.',
    summary: { products: products.length, failedProducts: products.filter(product => product.issues.length).length,
      maxHomepageLinkDepth: Math.max(...products.map(product => product.homepageLinkDepth || 0)) }, products };
  if (output) fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary, null, 2));
  products.filter(product => product.issues.length).forEach(product => console.error(product.url, product.issues));
  if (report.summary.failedProducts) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
