const fs=require('node:fs');
const path=require('node:path');
const cheerio=require('cheerio');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'products/sava-aurora-a7l-pro-carbon-road-bike-63.html'),'utf8');
for(const pro of [false,true]){
const $=cheerio.load(source);
const name=pro?'VOOK V8E Pro':'VOOK V8E';
const retailPrice=pro?180000:155000;
const formattedPrice='₹'+retailPrice.toLocaleString('en-IN');
const file=pro?'vook-v8e-pro-preview.html':'vook-v8e-preview.html';
$('base').attr('href','./');
$('title').text(name+' | Cyclify sample');
$('meta[name="robots"],meta[name="googlebot"]').attr('content','noindex,nofollow');
$('meta[property],meta[name^="twitter"],link[rel="canonical"],link[rel="preload"],script').remove();
const header=$('.topbar').first().prop('outerHTML');
const wheel=pro?'Velove Glide 50 mm carbon wheels · Ratchet hubs · 1,445 g':'WE ONE 25 mm aluminium wheels · Ratchet hubs · 1,680 g';
const image=(n,alt,portion=1)=>`<figure class="vook-detail-image" ${portion<1?`style="aspect-ratio:1200 / ${JSON.parse(fs.readFileSync(path.join(root,'assets/products/vook-v8e/manifest.json')))[n].height*portion};overflow:hidden"`:''}><img src="assets/products/vook-v8e/detail-${n}.png" alt="${alt}" loading="lazy" decoding="async" width="1200"></figure>`;
const specs=[['Frame','Carbon road frameset, full internal routing, flat-mount disc brakes, 12 × 142 mm rear thru-axle'],['Fork','T700 carbon, 12 × 100 mm front thru-axle'],['Wheels',wheel],['Shifting','L-TWOO eGR wireless electronic, 1 × 13 speed'],['Crankset','WE ONE 7075 aluminium chainring and EVS crank, 48T'],['Crank arm','165 mm for XS/S; 170 mm for M/L/XL'],['Cassette','EVS 13-speed 11–45T'],['Brakes','L-TWOO eGR hydraulic disc brakes, 160 mm rotors'],['Tyres','VEPOSS 700 × 28C'],['Handlebar','WE ONE MAX integrated carbon cockpit'],['Seatpost','Carbon, 12 mm setback'],['Saddle','WE ONE EVO carbon rails, 145 mm'],['Maximum total weight','110 kg, including bike, rider and cargo']];
$('body').attr('class','sava-a7l-page vook-page').html(`${header}
<nav class="product-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span>›</span><a href="bikes-frames.html">Bikes &amp; Frames</a><span>›</span><span aria-current="page">${name}</span></nav>
<main><section class="product a7l-product"><div class="a7l-media"><div class="gallery-main"><img id="vookBike" src="assets/products/vook-v8e/bike.png" alt="Official VOOK V8E bicycle reference photograph" width="1125" height="1125" fetchpriority="high"></div><nav class="vook-models" aria-label="Compare VOOK models"><a href="vook-v8e-preview.html" ${!pro?'aria-current="page"':''}>V8E</a><a href="vook-v8e-pro-preview.html" ${pro?'aria-current="page"':''}>V8E Pro · Velove wheels</a></nav></div>
<div class="a7l-buy-panel"><h1 class="name">${name} Carbon Road Bike</h1><div class="price-line"><div class="deal-head"><img src="assets/Logo-dark.png" alt="Cyclify"><span class="deal-divider"></span><span class="deal-word">DEAL</span></div><div class="deal-main"><span class="deal-price vook-pending">Price awaiting confirmation</span></div><div class="deal-meta"><span class="shipping-note">Free Shipping</span></div></div>
<p class="a7l-tax-note">${wheel}</p><hr class="a7l-rule">
<section class="a7l-boutique"><div class="boutique-heading"><span>YOUR VOOK, YOUR WAY</span><h2>Make it yours.</h2></div><div class="size-section"><div class="size-label a7l-size-heading">Select Frame Size<button class="a7l-geometry-trigger" id="geometryOpen" type="button" aria-haspopup="dialog">Size &amp; Geometry</button></div><div id="sizeOptions">${[['XS','46'],['S','49'],['M','51'],['L','53'],['XL','55']].map(([size,cm])=>`<button type="button" class="size-btn" data-size="${size}" aria-pressed="false">${size}<small>${cm} cm</small></button>`).join('')}</div></div>
<div class="size-section"><div class="size-label">Select Colour</div><div id="valveOptions"><button type="button" class="size-btn active" style="--swatch:#e6e6e6" aria-pressed="true">Silver / White</button></div></div><p class="a7l-variant-note">Frame sizes follow the official specification. Stock and colour availability are awaiting confirmation.</p><div class="boutique-footer"><div class="a7l-quantity"><label for="vookQuantity">Quantity</label><div class="a7l-stepper"><button type="button" data-step="-1" aria-label="Reduce quantity">−</button><input id="vookQuantity" type="number" min="1" max="10" value="1" aria-label="Quantity"><button type="button" data-step="1" aria-label="Increase quantity">+</button></div></div><div class="boutique-status"><span>Availability to be confirmed</span><span class="boutique-secure">Secure checkout</span></div></div></section>
<aside class="vook-notice"><strong>Important Notice</strong><p>This road frameset is designed for smooth, paved roads. It is not intended for gravel conversion or repeated impacts on rough terrain. Use on unsuitable surfaces may damage the frame or components and affect warranty coverage.</p></aside></div></section>
<section class="vook-details" aria-label="VOOK product details"><div class="vook-feature-intro"><span>VOOK V8E</span><h2>Carbon fibre racing road bike</h2><p>L-TWOO eGR wireless electronic shifting · 13 speeds</p><img src="assets/products/vook-v8e/bike.png" alt="VOOK carbon road bicycle" loading="lazy"></div>
${image(3,'L-TWOO eGR electronic shifting and V8E aluminium crankset')}
${image(5,'L-TWOO eGR shifters, cassette, rear derailleur, chain and hydraulic brakes',.9)}
${image(6,'VOOK carbon frameset and integrated carbon cockpit',.7)}
${image(7,'VOOK frame construction and frame geometry')}
${pro?`<section class="vook-wheel-upgrade"><span>CYCLIFY V8E PRO BUILD</span><h2>Velove Glide 50 mm</h2><p>Carbon rims. Ratchet hubs. Wheelset weight: 1,445 g.</p><p>This build uses the V8E base bike and its aluminium crankset, with the Velove carbon wheel upgrade.</p></section>`:image(9,'Standard V8E WE ONE 25 mm aluminium ratchet-hub wheelset')}
${image(10,'WE ONE MAX integrated carbon handlebar and cockpit dimensions')}
${image(11,'V8E bicycle and component photographs',.49)}
<section class="vook-specs"><h2>${name} specifications</h2><table><tbody>${specs.map(([key,value])=>`<tr><th scope="row">${key}</th><td>${value}</td></tr>`).join('')}</tbody></table></section>
</section></main>
<div class="buttons" id="productButtons"><button class="btn cartbtn" type="button" data-preview-action="cart">Add to Cart</button><button class="btn buybtn" type="button" data-preview-action="buy">Buy Now</button></div>
<dialog id="vookGeometry"><div class="vook-dialog-heading"><h2>Size &amp; Geometry</h2><button type="button" data-close aria-label="Close size geometry">×</button></div>${image(7,'Official VOOK V8E geometry and frame dimensions')}</dialog><dialog id="vookSelection"><div class="vook-dialog-heading"><h2>Your ${name}</h2><button type="button" data-close aria-label="Close build summary">×</button></div><p id="selectionSummary"></p><p>${wheel}</p><p>Price and availability await confirmation. This sample does not create an order.</p></dialog>
<script src="assets/js/site-footer.js"></script><script src="assets/js/global-search.js"></script><script src="assets/js/vook-preview.js"></script>`);
$('head').append('<link rel="stylesheet" href="assets/css/vook-preview.css">');
$('.gallery-main').addClass('vook-standard-hero');
$('.deal-price').removeClass('vook-pending').text(formattedPrice);
$('.deal-meta').prepend(`<span class="vook-retail-label">MRP ${formattedPrice} · Inclusive of taxes</span>`);
$('#productButtons').attr('data-retail-price',String(retailPrice));
$('#vookSelection p').last().text('Availability awaits confirmation. This sample does not create an order.');
$('#vookBike').attr('src','assets/products/vook-v8e/detail-11.png').attr('alt','VOOK V8E standard bicycle with aluminium wheels').removeAttr('height');
fs.writeFileSync(path.join(root,file),$.html());
console.log('Created '+file);
}
