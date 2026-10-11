const cheerio = require('cheerio');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const version = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 10);

function renderSavaA7l(page, product) {
  if (Number(product.id) !== 63) return page;
  const $ = cheerio.load(page, { decodeEntities: false });
  const manifestPath = path.join(root, 'assets/products/sava-a7l-2026/manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  const assets = Array.isArray(manifest) ? manifest : (manifest.assets || manifest.images || []);
  const asset = (pattern, fallback, group) => {
    const found = assets.find(item => (!group || item.group === group) && pattern.test(`${item.alt || ''} ${item.localPath || item.path || ''}`));
    return found?.localPath || found?.path || fallback;
  };
  const photo = (src, alt, cls = '') => `<img src="${esc(src)}" alt="${esc(alt)}" class="${cls}" loading="lazy" decoding="async">`;
  const picture = (name, alt, cls = '') => `<picture class="${cls}"><source media="(max-width:749px)" srcset="assets/products/sava-a7l-2026/${name}-mobile.jpg">${photo(`assets/products/sava-a7l-2026/${name}-desktop.jpg`, alt)}</picture>`;
  $('body').addClass('sava-a7l-page');
  $('meta[name="robots"]').after('<meta name="googlebot" content="index,follow,max-image-preview:large">');
  $('head').append(`<link rel="stylesheet" href="assets/css/sava-a7l.css?v=${version('assets/css/sava-a7l.css')}">`);
  const media = $('<div class="a7l-media"></div>');
  media.append($('#productGallery'), $('#productThumbs'));
  media.append('<div id="a7lGalleryDots" class="a7l-gallery-dots" aria-label="Product image navigation"></div>');
  media.find('#galleryMain').append('<button type="button" class="a7l-zoom" aria-label="Enlarge product image"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7.5 10.5h6M10.5 7.5v6"/></svg></button>');
  const panel = $('<div class="a7l-buy-panel"></div>');
  panel.append($('#productName'), $('#productPriceLine'));
  panel.find('#productName').text('SAVA A7L 2026 Carbon Bike');
  panel.append('<p class="a7l-tax-note">Inclusive of taxes. Free shipping across India.</p><hr class="a7l-rule">');
  const configurator = $('<section id="a7lBoutique" class="a7l-boutique" aria-label="Choose your bike configuration"></section>');
  configurator.append('<div class="boutique-heading"><span>YOUR A7L, YOUR WAY</span><h2>Make it yours.</h2></div>');
  panel.append(configurator);
  configurator.append($('#sizeSection'), $('#valveSection'));
  panel.find('#sizeSection .size-label').addClass('a7l-size-heading').append('<button type="button" class="a7l-geometry-trigger" aria-haspopup="dialog" aria-controls="a7lGeometryDialog">Size &amp; Geometry</button>');
  configurator.append('<p class="a7l-variant-note">Available colours depend on your selected frame size.</p>');
  configurator.append('<div class="boutique-footer"><div class="a7l-quantity"><label for="a7lQuantity">Quantity</label><div class="a7l-stepper"><button type="button" data-quantity-step="-1" aria-label="Reduce quantity">−</button><input id="a7lQuantity" type="number" min="1" max="10" value="1" inputmode="numeric" aria-label="Quantity"><button type="button" data-quantity-step="1" aria-label="Increase quantity">+</button></div></div><div class="boutique-status"><p id="a7lStock" class="a7l-stock" role="status"></p><span class="boutique-secure"><svg width="14" height="16" viewBox="0 0 16 18" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="2" y="7" width="12" height="9" rx="2"/><path d="M5 7V4a3 3 0 0 1 6 0v3"/></svg>Secure checkout</span></div></div>');
  panel.append($('#productFulfilment'));
  const purchaseButtons = $('#productButtons').remove();
  panel.append('<div class="a7l-intro"><p>A full-carbon road bike built around an aero T800 frame, a 24-speed drivetrain and hydraulic disc brakes. The 2026 A7L combines deep-section carbon wheels with an integrated cockpit for training, racing and everyday road rides.</p><ul><li>T800 carbon frame, fork, seatpost and 50 mm wheels</li><li>SENSAH HRD 2 × 12 controls with Shimano 105 R7100 derailleurs</li><li>Hydraulic disc braking with 160 mm rotors</li><li>50/34T crankset and 11–34T cassette</li><li>Full internal cable routing and UCI-approved frame</li></ul></div>');
  panel.append('<div class="a7l-quick-links"><a href="#a7lSpecs">Technical specifications <span>⌄</span></a><a href="#a7lGeometry">Size &amp; geometry <span>⌄</span></a></div>');
  $('.product').empty().addClass('a7l-product').append(media, panel);
  $('.product').after(purchaseButtons);
  // Retain the legacy render targets for shared catalogue code without duplicating visible specs.
  $('.specification-section').attr('hidden', '').addClass('a7l-legacy-specs');
  const specMap = new Map((product.specs || []).map(spec => {
    const at = spec.indexOf(':');
    return [spec.slice(0, at).trim(), spec.slice(at + 1).trim()];
  }));
  const rows = labels => labels.map(label => `<tr><th scope="row">${esc(label)}</th><td>${esc(specMap.get(label) || '')}</td></tr>`).join('');
  const groups = [
    ['General', ['Model', 'Manufacturer frame sizes', 'Manufacturer colours']],
    ['Frameset', ['Frame', 'Fork', 'Seatpost']],
    ['Drivetrain', ['Shifters', 'Front derailleur', 'Rear derailleur', 'Crankset', 'Cassette', 'Brakes', 'Chain']],
    ['Wheelsets', ['Wheelset', 'Rotors', 'Tyres', 'Hubs']],
    ['Components', ['Cockpit', 'Saddle', 'Pedals', 'Internal routing']]
  ];
  const geometry = [
    ['Recommended height (cm)', '155–165', '165–175', '173–183', '180–190', '190+'],
    ['A · Seat tube (mm)',443.3,471.5,511.5,541.5,562], ['B · Top tube (mm)',505,520,535,550,559],
    ['C · BB drop (mm)',70,70,70,70,70], ['D · Chainstay (mm)',410,410,410,410,410],
    ['E · Seat angle (°)',73.5,73.5,73.5,73.5,73.5], ['F · Head angle (°)',71.2,71.2,71.4,72,72],
    ['G · Front centre (mm)',555.8,570.3,585.5,594.5,604], ['H · Head tube (mm)',95,97.5,122.5,144.5,164.5],
    ['I · Fork offset (mm)',45,45,45,45,45], ['J · Reach (mm)',358.4,370,378,387,390.3],
    ['K · Stack (mm)',494.8,505.5,529,549.5,568.5], ['L · Fork length (mm)',373,373,373,373,373],
    ['M · Wheelbase (mm)',966.6,969.9,984.8,994.3,1004], ['N · Standover (mm)',734,753,787,807,826]
  ];
  const highlights = [
    ['Integrated carbon cockpit', 'A one-piece carbon handlebar and concealed cables keep the front end clean and aerodynamic.', /Integrated.*handlebar/i, 'assets/products/sava-aurora-a7l-pro-handlebar.jpg'],
    ['SENSAH HRD controls', 'Carbon levers bring together hydraulic braking and 2 × 12-speed shifting.', /Sens.*shifter/i, 'assets/products/sava-aurora-a7l-pro-shifter.jpg'],
    ['Shimano 105 R7100 shifting', 'A 12-speed Shimano 105 rear derailleur works with the wide-range 11–34T cassette.', /rear derailleur/i, 'assets/products/sava-aurora-a7l-pro-derailleur.jpg'],
    ['50 mm carbon wheels', 'Deep-section carbon rims offer an aerodynamic wheelset for fast road riding.', /700C carbon wheels/i, 'assets/products/sava-aurora-a7l-pro-wheels.jpg'],
    ['Hydraulic disc brakes', 'SENSAH hydraulic braking and 160 mm rotors provide controlled stopping power.', /hydraulic disc brake/i, 'assets/products/sava-aurora-a7l-pro-brake.jpg'],
    ['Compact 50/34T crankset', 'A compact chainset paired with an 11–34T cassette gives useful gearing for climbs and flats.', /crankset/i, 'assets/products/sava-aurora-a7l-pro-crankset.jpg'],
    ['UCI-approved frame', 'The R08 T800 carbon frame is designed around an aerodynamic road-racing platform.', /UCI approved/i, 'assets/products/sava-aurora-a7l-pro-uci.jpg']
  ];
  const detail = `<main class="a7l-details">
    <nav class="a7l-section-nav" aria-label="Product sections"><a href="#a7lOverview">Overview</a><a href="#a7lSpecs">Specs</a><a href="#a7lGeometry">Size &amp; geometry</a></nav>
    <section id="a7lOverview" class="a7l-overview"><h2>SAVA A7L 2026 Carbon Road Bike</h2><p>A lightweight SAVA road bike with a T800 carbon frame, 24-speed shifting, an integrated cockpit and hydraulic disc brakes. The A7L is a full-carbon bicycle for road training, racing and longer rides in India.</p><p>${Number(product.price) < 150000 ? 'Looking for a carbon road bike under ₹1.5 lakh or ₹2 lakh? ' : ''}The SAVA A7L is priced at ₹${Number(product.price).toLocaleString('en-IN')} at Cyclify, with free shipping across India.</p><div class="a7l-feature-tags"><span>Full carbon construction</span><span>Internal cable routing</span><span>Hydraulic disc brakes</span><span>UCI-approved frame</span></div>${picture('overview', 'SAVA A7L 2026 coastal road cycling', 'a7l-full-banner')}</section>
    <section class="a7l-carbon"><h2>T800 high-modulus carbon</h2><p>A T800 carbon frame, fork and seatpost create a light, stiff platform. The aero-shaped frame and fully internal cable routing give the bike its streamlined road-racing profile.</p>${picture('carbon-parts', 'SAVA A7L full carbon frame, fork, cockpit and wheels', 'a7l-full-banner')}<div class="a7l-carbon-grid"><article id="a7lCarbonPanel0">${picture('t800', 'Full T800 carbon construction')}<p>Carbon across the frame, fork, seatpost and rims balances low weight with stiffness for efficient riding.</p></article><article id="a7lCarbonPanel1" hidden>${picture('aero', 'Aero frame and internal cable routing')}<p>Streamlined tube shapes and concealed cables keep the aerodynamic road platform uncluttered.</p></article><div class="a7l-carbon-tabs" role="tablist" aria-label="Carbon construction features"><button type="button" role="tab" aria-selected="true" aria-controls="a7lCarbonPanel0" data-carbon-tab="0">Full T800 carbon construction</button><button type="button" role="tab" aria-selected="false" aria-controls="a7lCarbonPanel1" data-carbon-tab="1">Aero frame &amp; internal routing</button></div></div></section>
    <section class="a7l-highlights"><div class="a7l-section-heading"><h2>Highlights</h2><div><button type="button" data-highlight-step="-1" aria-label="Previous highlight">←</button><button type="button" data-highlight-step="1" aria-label="Next highlight">→</button></div></div><div class="a7l-highlight-track">${highlights.map(([title, text, pattern, fallback],index) => `<article>${photo(index===3?asset(pattern,fallback):`assets/products/sava-a7l-2026/${['highlight-cockpit','highlight-shifters','highlight-derailleur','wheels','highlight-brake','highlight-crankset','highlight-uci'][index]}.jpg`, title)}<h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div></section>
    <section class="a7l-riding"><article>${photo('assets/products/sava-a7l-2026/racing.jpg','A7L racing and competitive riding')}<h3>Racing &amp; competitive riding</h3><p>Aero shaping, carbon wheels and a 24-speed drivetrain for demanding road rides.</p></article><article>${photo('assets/products/sava-a7l-2026/recreation.jpg','A7L daily recreational riding')}<h3>Daily recreational riding</h3><p>A versatile gearing range for training loops and relaxed rides on the road.</p></article><article>${photo('assets/products/sava-a7l-2026/travel.png','A7L travel and outdoor adventure')}<h3>Travel &amp; outdoor adventure</h3><p>A lightweight road bike for exploring new routes and riding further.</p></article></section>
    <section class="a7l-at-a-glance"><h2>Your A7L at a glance</h2><p>The complete 2026 carbon road platform</p><div class="a7l-glance-layout">${photo(product.image, product.name)}<table><tbody>${rows(['Shifters','Front derailleur','Rear derailleur','Crankset','Brakes','Frame','Fork','Wheelset','Cockpit'])}</tbody></table></div></section>
    <section id="a7lSpecs" class="a7l-specifications"><h2>Specifications</h2>${groups.map(([title, labels], index) => `<details ${index === 0 ? 'open' : ''}><summary>${title}</summary><table><tbody>${rows(labels)}</tbody></table></details>`).join('')}</section>
    <section id="a7lGeometry" class="a7l-geometry"><details><summary>Size &amp; Geometry</summary><div class="a7l-geometry-content"><table class="a7l-height-table"><thead><tr><th scope="col">Frame size</th><th scope="col">Recommended height</th></tr></thead><tbody>${[['XS (44 cm)','155–165 cm'],['S (47 cm)','165–175 cm'],['M (51 cm)','173–183 cm'],['L (54 cm)','180–190 cm'],['XL (56 cm)','Above 190 cm']].map(pair => `<tr><th scope="row">${pair[0]}</th><td>${pair[1]}</td></tr>`).join('')}</tbody></table><p class="a7l-fit-note">Manufacturer sizing guide. Only the stocked frame sizes and colours shown in the purchase selector can be ordered.</p><h3>Frame geometry</h3>${photo(asset(/R21 frame geometry|geometry/i, 'assets/products/sava-a7l-2026/geometry.jpg'), 'SAVA A7L frame geometry diagram', 'a7l-geometry-diagram')}<div class="a7l-table-scroll" role="region" aria-label="Frame geometry measurements; scroll horizontally on mobile" tabindex="0"><table><thead><tr><th scope="col">Parameter</th>${['440 (XS)','470 (S)','510 (M)','540 (L)','560 (XL)'].map(size => `<th scope="col">${size}</th>`).join('')}</tr></thead><tbody>${geometry.map(row => `<tr><th scope="row">${row[0]}</th>${row.slice(1).map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="a7l-fit-note">Height recommendations are a starting point, not a guaranteed fit. Compare reach, stack and standover with your measurements before choosing.</p></div></details></section>
  </main><dialog id="a7lLightbox" class="a7l-lightbox" aria-label="Enlarged product image"><button type="button" class="a7l-lightbox-close" aria-label="Close enlarged image">×</button><img alt=""><div><button type="button" data-image-step="-1" aria-label="Previous product image">←</button><button type="button" data-image-step="1" aria-label="Next product image">→</button></div></dialog>`;
  $('.specification-section').after(detail);
  const geometryContent = $('#a7lGeometry .a7l-geometry-content').html();
  $('script[src*="site-footer.js"]').before(`<dialog id="a7lGeometryDialog" class="a7l-geometry-dialog" aria-labelledby="a7lGeometryDialogTitle"><div class="a7l-geometry-dialog-header"><h2 id="a7lGeometryDialogTitle">Size &amp; Geometry</h2><button type="button" class="a7l-geometry-close" aria-label="Close size and geometry">×</button></div><div class="a7l-details a7l-geometry-dialog-content">${geometryContent}</div></dialog>`);
  const route = new URL($('link[rel="canonical"]').attr('href')).pathname.replace(/^\//, '');
  $('a[href^="#a7l"]').each((_, element) => {
    $(element).attr('href', route + $(element).attr('href'));
  });
  $('script[src*="site-footer.js"]').before(`<script src="assets/js/sava-a7l.js?v=${version('assets/js/sava-a7l.js')}"></script>`);
  return $.html();
}

module.exports = { renderSavaA7l };
