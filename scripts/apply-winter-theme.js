/* Presentation-only winter dressing. Never changes catalogue or payment data. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const version = '20261113-christmas-1';
function winterWords(value) {
  return value.replace(/festival of lights/gi, 'winter celebration').replace(/diwali/gi, match => match === 'DIWALI' ? 'WINTER' : match === 'diwali' ? 'winter' : 'Winter');
}
function transform(html, file) {
  // Keep IDs, URLs, pricing scripts and JSON-LD contracts intact.
  html = html.replace(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)|(<[^>]+>)|([^<]+)/gi, (all, code, tag, text) => {
    if (code) return /application\/ld\+json/.test(code) && /CollectionPage/.test(code) ? winterWords(code) : code;
    if (tag) return tag.replace(/\b(alt|title|aria-label|content)=("[^"]*"|'[^']*')/gi, (_, key, value) => key + '=' + winterWords(value));
    return winterWords(text);
  });
  html = html.replace(/href="diwali-deals\.html/g, 'href="winter-deals.html');
  if (/^(?:diwali|winter)-deals\.html$/.test(file)) html = html.replace(/https:\/\/cyclify\.in\/diwali-deals\.html/g,'https://cyclify.in/winter-deals.html');
  html = html.replace(/(assets\/(?:css\/diwali-home\.css|js\/diwali\.js|js\/diwali-home\.js|js\/campaign-storefront\.js))\?v=[^"']+/g, '$1?v=' + version);
  if (!/<body\b/i.test(html) || /window\.location\.replace/.test(html) || /(?:admin|payment|checkout|cart)\.html$/.test(file)) return html;
  const prefix = /<base\s+href="\.\.\/"/i.test(html) || !file.includes(path.sep) ? '' : '../';
  const css = `<link rel="stylesheet" href="${prefix}assets/css/winter-site.css?v=${version}" data-winter-theme>`;
  if (!html.includes('data-winter-theme')) html = html.replace(/<\/head>/i, css + '\n</head>');
  if (!html.includes('data-winter-motion')) html = html.replace(/<\/head>/i, `<script src="${prefix}assets/js/winter-site.js?v=${version}" defer data-winter-motion></script>\n</head>`);
  html = html.replace(/<html([^>]*)>/i, (all, attrs) => {
    if (/class=/.test(attrs)) return '<html' + attrs.replace(/class="([^"]*)"/, (_, classes) => 'class="' + (classes.replace(/\s*cyclify-winter\b/g, '').trim() + ' cyclify-winter').trim() + '"') + '>';
    return '<html' + attrs + ' class="cyclify-winter">';
  });
  if (file.startsWith('products' + path.sep) && !html.includes('winter-product-banner')) {
    const banner = '<aside class="winter-product-banner" aria-label="Winter and Christmas at Cyclify"><div><span>CYCLIFY / WINTER &amp; CHRISTMAS</span><strong>A season for your next great ride.</strong><a href="winter-deals.html">Explore the winter collection ↗</a></div></aside>';
    if (/<\/header>/i.test(html)) html = html.replace(/<\/header>/i, '</header>' + banner);
    else if (/<div class="topbar">/.test(html)) html = html.replace(/<div class="topbar">[\s\S]*?<\/div>\s*<\/div>/, match => match + banner);
    else html = html.replace(/<body\b[^>]*>/i, match => match + banner);
  }
  return html;
}
function applyWinterTheme() {
  let count = 0;
  for (const file of ['diwali.js', 'campaign-storefront.js']) {
    const full = path.join(root, 'assets/js', file);
    const before = fs.readFileSync(full, 'utf8');
    const after = before.replace(/Diwali offer/g, 'Current offer').replace(/DIWALI OFFER/g, 'CURRENT OFFER');
    if (before !== after) fs.writeFileSync(full, after);
  }
  for (const dir of ['', 'products', 'templates']) {
    for (const name of fs.readdirSync(path.join(root, dir))) {
      if (!name.endsWith('.html')) continue;
      const file = path.join(dir, name), full = path.join(root, file);
      const before = fs.readFileSync(full, 'utf8');
      let after = transform(before, file);
      if (name === '404.html') after = after.replace(/\r\n/g,'\n');
      if (name === 'index.html') {
        after = after.replace('THE CYCLIFY WINTER FESTIVAL / 2026','CYCLIFY WINTER &amp; CHRISTMAS / 2026')
          .replace('10% off eligible ThinkRider accessories','Discover the ThinkRider winter collection')
          .replace('Already applied · No code needed · While in stock','Current product prices · Check availability on each product')
          .replace('ThinkRider X2 Max ₹29,999 · 10% off other ThinkRider products · Explore current prices across every collection.','Explore current prices and availability across every collection.');
        after = after.replace(/<div class="diwali-home-celebration"[\s\S]*?<\/svg><\/div><div class="diwali-cracker-scene"[\s\S]*?<\/div><\/div>/g, '')
          .replace(/<svg class="diwali-category-festive"[\s\S]*?<\/svg>/g, '')
          .replace(/<style id="diwaliMotionStyles">[\s\S]*?<\/style>/g, '');
        after = after.replace(/winter-festival-2026-santa-flight\.png/g, 'winter-festival-2026-santa-flight.webp');
      }
      if (after !== before) { fs.writeFileSync(full, after); count++; }
    }
  }
  const legacy = path.join(root, 'diwali-deals.html');
  if (fs.existsSync(legacy) && !fs.readFileSync(legacy,'utf8').includes('window.location.replace')) {
    const winter = fs.readFileSync(legacy, 'utf8').replace(/https:\/\/cyclify\.in\/diwali-deals\.html/g, 'https://cyclify.in/winter-deals.html');
    fs.writeFileSync(path.join(root, 'winter-deals.html'), winter);
    fs.writeFileSync(legacy, '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>Winter collection | Cyclify India</title><link rel="canonical" href="https://cyclify.in/winter-deals.html"><meta http-equiv="refresh" content="0;url=/winter-deals.html"><script>window.location.replace("/winter-deals.html"+location.hash);</script></head><body><a href="/winter-deals.html">Explore the winter collection</a></body></html>\n');
  }
  const sitemapFile = path.join(root, 'sitemap.xml');
  if (fs.existsSync(sitemapFile)) {
    let sitemap = fs.readFileSync(sitemapFile,'utf8').replace(/\s*<url>\s*<loc>https:\/\/cyclify\.in\/diwali-deals\.html<\/loc>[\s\S]*?<\/url>/g,'');
    if (!sitemap.includes('https://cyclify.in/winter-deals.html')) sitemap = sitemap.replace('</urlset>','  <url><loc>https://cyclify.in/winter-deals.html</loc></url>\n</urlset>');
    fs.writeFileSync(sitemapFile,sitemap);
  }
  console.log('Winter presentation applied to ' + count + ' pages; catalogue/payment data untouched.');
}
module.exports = {applyWinterTheme, transform};
if (require.main === module) applyWinterTheme();
