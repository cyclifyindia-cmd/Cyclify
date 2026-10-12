const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const root = path.resolve(__dirname, '..');
const guideData = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'data', 'guides.json'), 'utf8')).guides || [];
const guideFiles = guideData.map(guide => guide.slug + '/index.html');
const files = fs.readdirSync(root).filter(file => file.endsWith('.html'))
  .concat(fs.readdirSync(path.join(root, 'products')).filter(file => file.endsWith('.html')).map(file => 'products/' + file))
  .concat(guideFiles);
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const failures = [];
const canonicals = new Map();
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
let indexable = 0;
const incomingLinks = new Set();
const categoryFiles = new Set(['bikes-frames.html','wearables.html','accessories.html','components.html','wheels-tyres.html','electronics.html']);

function localFileForUrl(url) {
  let pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!pathname) pathname = 'index.html';
  if (pathname.endsWith('/')) pathname += 'index.html';
  return path.join(root, ...pathname.split('/'));
}

files.forEach(relative => {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const robots = source.match(/<meta name="robots" content="([^"]+)"/i)?.[1] || '';
  if (/\bnoindex\b/i.test(robots)) return;
  const $ = cheerio.load(source);
  indexable += 1;
  const title = source.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  const description = source.match(/<meta name="description" content="([^"]*)"/i)?.[1]?.trim() || '';
  const canonical = source.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] || '';
  if (!title || title.length > 65) failures.push(relative + ': title length ' + title.length);
  if (!description || description.length > 160) failures.push(relative + ': description length ' + description.length);
  if (!canonical) failures.push(relative + ': missing canonical');
  if (categoryFiles.has(relative) || relative.endsWith('-bikes.html') || relative === 'tavelo-arow.html') {
    if ($('h1').length !== 1 || !$('h1').text().trim()) failures.push(relative + ': missing visible page heading');
  }
  if (categoryFiles.has(relative)) {
    if (!$('#products a[href]').length) failures.push(relative + ': no crawlable initial product links');
  }
  const schemaEntities = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const json = JSON.parse($(element).html());
      schemaEntities.push(...(json['@graph'] || (Array.isArray(json) ? json : [json])));
    } catch (error) { failures.push(relative + ': invalid JSON-LD: ' + error.message); }
  });
  if (relative.startsWith('products/')) {
    const product = schemaEntities.find(entity => entity['@type'] === 'Product');
    if (!product) failures.push(relative + ': missing Product schema');
    if (!$('#productName').text().trim() || !$('#productPrice').text().trim()) failures.push(relative + ': empty initial product name or price');
    if (product?.offers) {
      if (!(Number(product.offers.price) > 0) || product.offers.priceCurrency !== 'INR') failures.push(relative + ': invalid product offer price');
      if (product.offers.url !== canonical) failures.push(relative + ': offer/canonical URL mismatch');
    }
    if (!schemaEntities.some(entity => entity['@type'] === 'BreadcrumbList')) failures.push(relative + ': missing product breadcrumbs');
  }
  schemaEntities.filter(entity => entity['@type'] === 'CollectionPage').forEach(entity => {
    if (entity.url !== canonical) failures.push(relative + ': collection schema/canonical URL mismatch');
  });
  if (relative.startsWith('products/') || relative === 'guides.html' || guideFiles.includes(relative)) {
    const renderedSource = source.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '');
    const h1Count = [...renderedSource.matchAll(/<h1\b/gi)].length;
    if (h1Count !== 1) failures.push(relative + ': expected one H1, found ' + h1Count);
  }
  if (canonical) {
    const owners = canonicals.get(canonical) || [];
    owners.push(relative);
    canonicals.set(canonical, owners);
    if (!sitemap.includes('<loc>' + canonical + '</loc>')) failures.push(relative + ': missing from sitemap');
  }

  const pageUrl = new URL(relative === 'index.html' ? '/' : '/' + relative, 'https://cyclify.in');
  const baseHref = source.match(/<base href="([^"]+)"/i)?.[1];
  const baseUrl = baseHref ? new URL(baseHref, pageUrl) : pageUrl;
  for (const match of source.matchAll(/href="([^"]+)"/gi)) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href) || href.includes('${')) continue;
    let url;
    try { url = new URL(href, baseUrl); } catch (error) { continue; }
    if (!['cyclify.in', 'www.cyclify.in'].includes(url.hostname)) continue;
    incomingLinks.add('https://cyclify.in' + url.pathname);
    if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
      if (!fs.existsSync(localFileForUrl(url))) failures.push(relative + ': broken internal link ' + url.pathname);
    }
  }
});

canonicals.forEach((owners, canonical) => {
  if (owners.length > 1) failures.push('Duplicate canonical ' + canonical + ': ' + owners.join(', '));
});

if (new Set(sitemapUrls).size !== sitemapUrls.length) failures.push('Sitemap contains duplicate URLs');
for (const entry of sitemap.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>[\s\S]*?<\/url>/g)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry[2])) failures.push('Invalid sitemap lastmod for ' + entry[1]);
  if (entry[2] > new Date().toISOString().slice(0, 10)) failures.push('Future sitemap lastmod for ' + entry[1]);
}
sitemapUrls.forEach(value => {
  const url = new URL(value);
  if (!fs.existsSync(localFileForUrl(url))) failures.push('Sitemap target is missing: ' + url.pathname);
  else {
    const target = fs.readFileSync(localFileForUrl(url), 'utf8');
    const $target = cheerio.load(target);
    if (/noindex/i.test($target('meta[name="robots"]').attr('content') || '')) failures.push('Noindex page in sitemap: ' + value);
    if ($target('link[rel="canonical"]').attr('href') !== value) failures.push('Sitemap/canonical mismatch: ' + value);
  }
  if (url.pathname.startsWith('/products/') && !incomingLinks.has(value)) failures.push('Product has no crawlable internal link: ' + value);
});

for (const relative of files.filter(file => /preview|^admin\.html$|^account\.html$|^cart\.html$|^checkout\.html$|^payment-/.test(file))) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!/noindex/i.test(cheerio.load(source)('meta[name="robots"]').attr('content') || '')) failures.push(relative + ': private/preview page must be noindex');
}

const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
if (!/^Allow:\s*\/$/mi.test(robots)) failures.push('robots.txt does not allow the website');
if (!/Sitemap:\s*https:\/\/cyclify\.in\/sitemap\.xml/i.test(robots)) failures.push('robots.txt sitemap URL is missing');

console.log('Indexable pages checked: ' + indexable);
console.log('SEO failures: ' + failures.length);
if (failures.length) {
  console.log(failures.slice(0, 80).join('\n'));
  process.exitCode = 1;
}
