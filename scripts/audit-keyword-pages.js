'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const root = path.resolve(__dirname, '..');
const collectionPages = [
  'road-bikes-india.html',
  'mountain-bikes-india.html',
  'hybrid-bicycles-india.html',
  'carbon-bike-frames-india.html',
  'bicycle-tools-india.html',
  'bicycle-maintenance-products.html',
  'cycling-sunglasses-india.html',
  'cycling-jerseys-shorts-india.html',
  'cycling-gloves-india.html',
  'bicycle-bottle-cages-india.html',
  'bicycle-tyres-india.html',
  'bicycle-saddles-india.html'
];
const guideData = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'data', 'guides.json'), 'utf8')).guides || [];
const failures = [];

for (const file of collectionPages) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const $ = cheerio.load(source);
  const canonical = `https://cyclify.in/${file}`;
  if ($('link[rel="canonical"]').attr('href') !== canonical) failures.push(`${file}: incorrect canonical URL`);
  if ($('meta[name="robots"]').attr('content')?.includes('noindex')) failures.push(`${file}: unexpectedly noindex`);
  if ($('h1').length !== 1 || !$('h1').text().trim()) failures.push(`${file}: expected one useful H1`);
  if ($('meta[name="description"]').attr('content')?.length < 90) failures.push(`${file}: description is too thin`);
  if (!$('#products a[href*="products/"]').length) failures.push(`${file}: no crawlable product links`);
  let collection;
  try {
    const json = JSON.parse($('#cyclify-category-schema').html());
    collection = (json['@graph'] || []).find(entity => entity['@type'] === 'ItemList');
  } catch (error) {
    failures.push(`${file}: invalid collection JSON-LD`);
  }
  if (!(collection?.numberOfItems > 0)) failures.push(`${file}: empty structured product list`);
}

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const file of collectionPages) {
  if (!home.includes(`href="${file}"`)) failures.push(`${file}: not linked from the homepage browse navigation`);
}

const guideHub = fs.readFileSync(path.join(root, 'guides.html'), 'utf8');
for (const guide of guideData) {
  const guideFile = path.join(root, guide.slug, 'index.html');
  if (!fs.existsSync(guideFile)) failures.push(`${guide.slug}: generated guide is missing`);
  if (!guideHub.includes(`href="${guide.slug}/"`)) failures.push(`${guide.slug}: not linked from the guide hub`);
}

console.log(`Keyword collection pages checked: ${collectionPages.length}`);
console.log(`Cycling guides checked: ${guideData.length}`);
console.log(`Keyword SEO failures: ${failures.length}`);
if (failures.length) {
  console.log(failures.join('\n'));
  process.exitCode = 1;
}
