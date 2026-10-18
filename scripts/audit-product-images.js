const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const productsDir = path.join(root, 'products');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const merchantFeed = fs.readFileSync(path.join(root, 'google-merchant-feed.xml'), 'utf8');
const failures = [];
const primaryImages = new Map();
let merchantExcludedPageCount = 0;

function match(source, expression, label, file) {
  const result = source.match(expression);
  if (!result) failures.push(file + ': missing ' + label);
  return result ? result[1] : '';
}

const pages = fs.readdirSync(productsDir)
  .filter(file => file.endsWith('.html'))
  .filter(file => /<meta name="robots" content="index,follow(?:,[^"]*)?">/i.test(fs.readFileSync(path.join(productsDir, file), 'utf8')));

for (const file of pages) {
  const source = fs.readFileSync(path.join(productsDir, file), 'utf8');
  const isPriceOnRequest = /<p>Price on request<\/p>/i.test(source);
  if (isPriceOnRequest) merchantExcludedPageCount += 1;
  const canonical = match(source, /<link rel="canonical" href="([^"]+)">/i, 'canonical URL', file);
  const ogImage = match(source, /<meta property="og:image" content="([^"]+)">/i, 'Open Graph image', file);
  const secureImage = match(source, /<meta property="og:image:secure_url" content="([^"]+)">/i, 'secure Open Graph image', file);
  const twitterImage = match(source, /<meta name="twitter:image" content="([^"]+)">/i, 'Twitter image', file);
  const preloadImage = match(source, /<link rel="preload" as="image" href="([^"]+)" fetchpriority="high">/i, 'preloaded hero image', file);
  const mainImage = match(source, /<img id="productImage" src="([^"]+)"[^>]*alt="[^"]+"[^>]*fetchpriority="high"/i, 'server-rendered product image', file);
  const schemaSource = match(source, /<script type="application\/ld\+json" id="cyclify-product-schema">([\s\S]*?)<\/script>/i, 'product structured data', file);
  let schemaImage = '';
  if (schemaSource) {
    try {
      const schema = JSON.parse(schemaSource);
      const product = (schema['@graph'] || []).find(item => item['@type'] === 'Product');
      schemaImage = Array.isArray(product && product.image) ? product.image[0] : (product && product.image) || '';
    } catch (error) {
      failures.push(file + ': invalid product structured data');
    }
  }

  const signals = [secureImage, twitterImage, preloadImage, mainImage, schemaImage].filter(Boolean);
  if (!ogImage.startsWith('https://')) failures.push(file + ': primary image must use an absolute HTTPS URL');
  if (signals.some(value => value !== ogImage)) failures.push(file + ': product image signals do not all match');
  if (canonical && (!sitemap.includes('<loc>' + canonical + '</loc>') || !sitemap.includes('<image:loc>' + ogImage.replace(/&/g, '&amp;') + '</image:loc>'))) {
    failures.push(file + ': product or primary image missing from sitemap');
  }
  if (!isPriceOnRequest && canonical && (!merchantFeed.includes('<link>' + canonical.replace(/&/g, '&amp;') + '</link>') || !merchantFeed.includes('<g:image_link>' + ogImage.replace(/&/g, '&amp;') + '</g:image_link>'))) {
    failures.push(file + ': product or primary image missing from Google Merchant feed');
  }
  if (ogImage.startsWith('https://cyclify.in/')) {
    const localPath = path.join(root, decodeURIComponent(new URL(ogImage).pathname).replace(/^[/\\]+/, ''));
    if (!fs.existsSync(localPath)) failures.push(file + ': local primary image file does not exist');
  }

  if (!primaryImages.has(ogImage)) primaryImages.set(ogImage, []);
  primaryImages.get(ogImage).push(file);
}

const duplicateImages = [...primaryImages.entries()].filter(([, files]) => files.length > 1);
const merchantItemCount = (merchantFeed.match(/<item>/g) || []).length;
console.log('Product image pages checked: ' + pages.length);
console.log('Google Merchant feed products: ' + merchantItemCount);
console.log('Price-on-request pages excluded from Merchant feed: ' + merchantExcludedPageCount);
console.log('Unique primary images: ' + primaryImages.size);
console.log('Duplicate primary image groups: ' + duplicateImages.length);
if (duplicateImages.length) duplicateImages.forEach(([image, files]) => console.log('  ' + image + ': ' + files.join(', ')));
if (merchantItemCount !== pages.length - merchantExcludedPageCount) failures.push('Google Merchant feed product count does not match eligible indexable product pages');

if (failures.length) {
  console.error('Product image SEO failures: ' + failures.length);
  failures.forEach(failure => console.error('  - ' + failure));
  process.exitCode = 1;
} else {
  console.log('Product image SEO failures: 0');
}
