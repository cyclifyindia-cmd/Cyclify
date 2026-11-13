const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const cheerio = require('cheerio');
const root = path.resolve(__dirname,'..');
let count=0;
for (const name of fs.readdirSync(path.join(root,'products')).filter(n=>n.endsWith('.html'))) {
  const file='products/'+name, html=fs.readFileSync(path.join(root,file),'utf8'), $=cheerio.load(html);
  if (/window\.location\.replace/.test(html)) continue; // Legacy aliases redirect to themed canonical pages.
  assert.equal($('[data-winter-theme]').length,1,file+' theme');
  assert.equal($('.winter-product-banner').length,1,file+' banner');
  const before=execFileSync('git',['show','HEAD:'+file],{cwd:root,maxBuffer:4000000,encoding:'utf8'}), old=cheerio.load(before);
  assert.equal($('#cyclify-product-schema').text(),old('#cyclify-product-schema').text(),file+' product schema changed');
  assert.equal($('button').length,old('button').length,file+' buttons changed');
  $('script,style').remove();
  assert(!/diwali/i.test($('body').text()),file+' old customer copy');
  count++;
}
const home=cheerio.load(fs.readFileSync(path.join(root,'index.html'),'utf8'));
assert.equal(home('.diwali-home-copy h2').length,1);
assert.equal(home('.diwali-home-product').length,1);
assert.equal(home('.diwali-category-card').length,6);
assert.equal(home('.diwali-category-festive').length,0);
assert.equal(home('.diwali-home-celebration').length,0);
assert.equal(home('.winter-product-gift').length,6);
assert.equal(home('[data-winter-theme]').length,1);
console.log('PASS: '+count+' product pages; schemas and button counts unchanged. Homepage structure and winter assets verified.');
