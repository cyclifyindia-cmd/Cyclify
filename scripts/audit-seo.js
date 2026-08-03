const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(root).filter(file => file.endsWith('.html'))
  .concat(fs.readdirSync(path.join(root, 'products')).filter(file => file.endsWith('.html')).map(file => 'products/' + file));
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const failures = [];
const canonicals = new Map();
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
let indexable = 0;

function localFileForUrl(url) {
  let pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!pathname) pathname = 'index.html';
  if (pathname.endsWith('/')) pathname += 'index.html';
  return path.join(root, ...pathname.split('/'));
}

files.forEach(relative => {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const robots = source.match(/<meta name="robots" content="([^"]+)"/i)?.[1] || '';
  if (!/\bindex\b/i.test(robots) || /\bnoindex\b/i.test(robots)) return;
  indexable += 1;
  const title = source.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  const description = source.match(/<meta name="description" content="([^"]*)"/i)?.[1]?.trim() || '';
  const canonical = source.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] || '';
  if (!title || title.length > 65) failures.push(relative + ': title length ' + title.length);
  if (!description || description.length > 160) failures.push(relative + ': description length ' + description.length);
  if (!canonical) failures.push(relative + ': missing canonical');
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
    if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
      if (!fs.existsSync(localFileForUrl(url))) failures.push(relative + ': broken internal link ' + url.pathname);
    }
  }
});

canonicals.forEach((owners, canonical) => {
  if (owners.length > 1) failures.push('Duplicate canonical ' + canonical + ': ' + owners.join(', '));
});

if (new Set(sitemapUrls).size !== sitemapUrls.length) failures.push('Sitemap contains duplicate URLs');
sitemapUrls.forEach(value => {
  const url = new URL(value);
  if (!fs.existsSync(localFileForUrl(url))) failures.push('Sitemap target is missing: ' + url.pathname);
});

const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
if (!/^Allow:\s*\/$/mi.test(robots)) failures.push('robots.txt does not allow the website');
if (!/Sitemap:\s*https:\/\/cyclify\.in\/sitemap\.xml/i.test(robots)) failures.push('robots.txt sitemap URL is missing');

console.log('Indexable pages checked: ' + indexable);
console.log('SEO failures: ' + failures.length);
if (failures.length) {
  console.log(failures.slice(0, 80).join('\n'));
  process.exitCode = 1;
}
