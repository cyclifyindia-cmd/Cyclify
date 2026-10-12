'use strict';
const cheerio = require('cheerio');

async function main() {
  const origin = 'https://cyclify.in';
  const sitemapResponse = await fetch(origin + '/sitemap.xml', { signal: AbortSignal.timeout(20000), headers: { 'Cache-Control': 'no-cache' } });
  if (!sitemapResponse.ok) throw new Error('Sitemap HTTP ' + sitemapResponse.status);
  const xml = cheerio.load(await sitemapResponse.text(), { xmlMode: true });
  const urls = xml('url > loc').toArray().map(element => xml(element).text());
  const failures = [];
  let checked = 0;
  const pending = [...urls];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length) {
      const url = pending.shift();
      if (new URL(url).origin !== origin) { failures.push('Unexpected sitemap origin: ' + url); continue; }
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'Cache-Control': 'no-cache' } });
        if (!response.ok) { failures.push(url + ': HTTP ' + response.status); continue; }
        const $ = cheerio.load(await response.text());
        if ($('link[rel="canonical"]').attr('href') !== url) failures.push(url + ': canonical mismatch');
        if (/noindex/i.test($('meta[name="robots"]').attr('content') || '')) failures.push(url + ': noindex in live sitemap');
        if (!$('title').text().trim() || !$('meta[name="description"]').attr('content')) failures.push(url + ': missing search metadata');
        if (new URL(url).pathname.startsWith('/products/') && (!$('#productName').text().trim() || !$('#productPrice').text().trim())) failures.push(url + ': initial product content missing');
        checked++;
      } catch (error) { failures.push(url + ': ' + error.message); }
    }
  }));
  console.log('Live sitemap URLs checked: ' + checked + '/' + urls.length);
  console.log('Live SEO failures: ' + failures.length);
  failures.forEach(failure => console.error(failure));
  if (failures.length) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
