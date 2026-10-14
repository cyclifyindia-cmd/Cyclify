const fs=require('node:fs');
const path=require('node:path');
const cheerio=require('cheerio');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const version=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,10);
function renderVook(page,product){
if(![88001,88002].includes(Number(product.id)))return page;
const $=cheerio.load(page);const pro=Number(product.id)===88002;
const sample=cheerio.load(fs.readFileSync(path.join(root,pro?'vook-v8e-pro-preview.html':'vook-v8e-preview.html'),'utf8'));
$('body').addClass('sava-a7l-page vook-page');
$('head').append(`<link rel="stylesheet" href="assets/css/sava-a7l.css?v=${version('assets/css/sava-a7l.css')}"><link rel="stylesheet" href="assets/css/vook-preview.css?v=${version('assets/css/vook-preview.css')}">`);
const media=$('<div class="a7l-media"></div>').append($('#productGallery'),$('#productThumbs'));
if(!product.imageByColour)media.append('<p class="vook-photo-note">Official reference photograph. Stocked frame colours: Black, Blue and Pink.</p>');
media.append('<nav class="vook-models" aria-label="Compare VOOK models"><a href="products/vook-v8e-carbon-road-bike-88001.html">V8E</a><a href="products/vook-v8e-pro-carbon-road-bike-88002.html">V8E Pro · Velove wheels</a></nav>');
media.find(`a[href*="${product.id}"]`).attr('aria-current','page');
const panel=$('<div class="a7l-buy-panel"></div>').append($('#productName'),$('#productPriceLine'));
if(pro)panel.append('<p class="a7l-tax-note">Velove Glide 50 mm carbon wheels · Ratchet hubs · 1,445 g</p>');
panel.append('<hr class="a7l-rule">');
const boutique=$('<section class="a7l-boutique" aria-label="Choose your bike configuration"><div class="boutique-heading"><span>YOUR VOOK, YOUR WAY</span><h2>Make it yours.</h2></div></section>');
boutique.append($('#sizeSection'),$('#valveSection'));
boutique.find('#sizeSection .size-label').addClass('a7l-size-heading').append('<button type="button" class="a7l-geometry-trigger" id="geometryOpen" aria-haspopup="dialog" aria-controls="vookGeometry">Size &amp; Geometry</button>');
boutique.append(`<p class="a7l-variant-note">S, M and L available in ${product.secondaryOptions.join(', ')}.</p><div class="boutique-footer"><div class="a7l-quantity"><label for="a7lQuantity">Quantity</label><div class="a7l-stepper"><button type="button" data-vook-step="-1" aria-label="Reduce quantity">−</button><input id="a7lQuantity" type="number" min="1" max="10" value="1" aria-label="Quantity"><button type="button" data-vook-step="1" aria-label="Increase quantity">+</button></div></div><div class="boutique-status"><span class="a7l-stock">In stock</span><span class="boutique-secure">Secure checkout</span></div></div>`);
panel.append(boutique,$('#productFulfilment'),sample('.vook-notice'));
const buttons=$('#productButtons').remove();
$('.product').empty().addClass('a7l-product').append(media,panel).after(buttons);
$('.specification-section').attr('hidden','').addClass('a7l-legacy-specs');
const details=sample('.vook-details').clone();
if(product.imageByColour)details.find('.vook-feature-intro img').attr('src',product.image).attr('alt',product.name+' — Black');
const specTable=details.find('.vook-specs tbody').empty();
for(const raw of product.specs){const split=raw.indexOf(':');specTable.append($('<tr></tr>').append($('<th scope="row"></th>').text(raw.slice(0,split)),$('<td></td>').text(raw.slice(split+1).trim())));}
$('.specification-section').after(details);
const dialog=sample('#vookGeometry').clone();
$('script[src*="site-footer.js"]').before(dialog,`<script src="assets/js/vook-product.js?v=${version('assets/js/vook-product.js')}"></script>`);
return $.html();
}
module.exports={renderVook};
