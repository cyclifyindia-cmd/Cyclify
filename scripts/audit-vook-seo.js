const fs=require('node:fs');
const assert=require('node:assert/strict');
const cheerio=require('cheerio');
for(const [id,file,price] of [[88001,'vook-v8e-carbon-road-bike-88001.html',155000],[88002,'vook-v8e-pro-carbon-road-bike-88002.html',180000]]){
const $=cheerio.load(fs.readFileSync('products/'+file,'utf8'));
const graph=JSON.parse($('#cyclify-product-schema').html())['@graph'];
const product=graph.find(item=>item['@type']==='Product');
assert.equal(product.brand.name,'VOOK');assert.equal(Number(product.offers.price),price);
assert.equal(product.image.length,4);assert.ok(product.image.every(image=>image.includes(id===88001?'/vook-v8e/':'/vook-v8e-pro/')));
assert.ok($('title').text().includes('India'));assert.ok($('a[href="vook-bikes.html"]').length);
assert.ok($('.vook-search-details').text().includes('VOOK V8'));
assert.ok(!product.aggregateRating,'Do not invent ratings');
assert.equal($('link[rel="canonical"]').attr('href'),'https://cyclify.in/products/'+file);
}
const $=cheerio.load(fs.readFileSync('vook-bikes.html','utf8'));
assert.equal($('h1').length,1);assert.equal($('#products h3 a').length,2);
assert.ok($('meta[name="robots"]').attr('content').startsWith('index,follow'));
assert.ok(fs.readFileSync('sitemap.xml','utf8').includes('https://cyclify.in/vook-bikes.html'));
assert.ok(fs.readFileSync('index.html','utf8').includes('href="vook-bikes.html"'));
console.log('VOOK SEO verified: 2 product pages, 4 correct colour images each, brand collection, sitemap and homepage links.');
