'use strict';
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../assets/css/diwali-motion.css'),'utf8');
const saleCss=fs.readFileSync(path.join(__dirname,'../assets/css/diwali-sale.css'),'utf8');

function saleCategories(){
 const product=(file,name)=>['assets/products/expanded/'+file+'.webp',name];
 const cards=[
  ['bikes-frames.html','Bikes &amp; Frames','A new ride. A new beginning.',[
   product('d1ee68ec1f0a3a8010','Colnago V4'),product('2cea500fa99c615b49','Basso Venta R'),product('0638b2cc0708c816af','Orbea Orca M30'),product('328419fd7d80d50d42','Felt AR Ultegra Di2')]],
  ['wheels-tyres.html','Wheels &amp; Tyres','Make every kilometre count.',[
   product('8e385cf52cb91567a9','Vision SC 60'),product('b505cfc7e6bea3b973','Reynolds AR 60'),product('fd3752249241a1ba93','Fulcrum Sharq'),product('c4ba2666627a0ded5d','Vision TC 60')]],
  ['electronics.html','Electronics','Light up your training.',[
   ['assets/products/igpsport-igs800-device.webp','iGPSPORT iGS800'],['assets/products/thinkrider-x2-max-1.jpg','ThinkRider X2 Max'],product('50094688df30b1f341','Favero Assioma Pro RL-2'),['assets/products/thinkrider-xx-pro-1.png','ThinkRider XX Pro']]],
  ['components.html','Components','The details make the ride.',[
   product('11aa231dd6f26ec8f8','Selle Italia SLR Boost TM'),product('ea38f1900f22e96a94','Controltech SLA handlebar'),product('ff7d1128f5ef6d4089','Tripeak T47 G5'),product('3a081a13f15d5bc534','Controltech Cougar stem')]],
  ['wearables.html','Apparel &amp; Wearables','Ready for your festive ride.',[
   product('f97e04cc85cadd287b','Rudy Project Nytron'),product('7716d55728e5d25651','Rudy Project Cutline'),product('e3ff3386581bf99608','MB Wear Comfort jersey'),product('12bb29ff50783fe3fc','MB Wear bibshorts')]],
  ['accessories.html','Accessories','Little gifts. More happy miles.',[
   product('cd64e087107dbcbc7c','Controltech Rib cage'),product('d3ae9de1f7010754ac','Selle Italia Nastro Smart Tape'),product('559c985c6166088086','Scicon AeroComfort bag'),product('4386960618d7807a59','Controltech Time Zone hydration')]]
 ];
 const cardHtml=cards.map(([url,name,copy,photos],i)=>{
  const slides=[...photos,photos[0]].map(([src,label],j)=>`<div class="diwali-category-slide${j===photos.length?' is-clone':''}" data-name="${label}" aria-hidden="true"><img ${j===0?'src':'data-src'}="${src}" alt="" width="600" height="450" loading="lazy" decoding="async" fetchpriority="low"></div>`).join('');
  return `<a class="diwali-category-card" href="${url}" aria-label="Shop ${name}" data-campaign-event="campaign_category_click"><div class="diwali-category-top"><span>DIWALI EDIT</span><b aria-hidden="true">0${i+1}</b></div><div class="diwali-category-photo" data-category-reel role="img" aria-label="${photos[0][1]}"><div class="diwali-category-track">${slides}</div></div><div class="diwali-category-caption" aria-hidden="true"><strong data-reel-name>${photos[0][1]}</strong><span data-reel-count>1 / ${photos.length}</span></div><div class="diwali-category-copy"><h3>${name}</h3><p>${copy}</p><span>Shop collection <b aria-hidden="true">↗</b></span></div></a>`;
 }).join('');
 return `<section class="diwali-categories" aria-labelledby="diwaliCategoryTitle"><div class="diwali-categories-inner"><header><div><p class="diwali-sale-kicker">THE FESTIVAL OF LIGHTS. THE JOY OF RIDING.</p><h2 id="diwaliCategoryTitle">Your Diwali. <em>Your next upgrade.</em></h2><p class="diwali-reel-hint">Scroll to discover more in every collection.</p></div><a href="diwali-deals.html">Explore Diwali offers <span aria-hidden="true">↗</span></a></header><div class="diwali-category-grid">${cardHtml}</div><p class="diwali-category-note">ThinkRider X2 Max ₹29,999 · 10% off other ThinkRider products · Explore current prices across every collection.</p></div></section>`;
}

function diyaScene(){
 const lamps=[['translate(43 97) scale(.65)','-.9s'],['translate(112 94) scale(.95)','-.35s'],['translate(181 97) scale(.65)','-1.5s']].map(([transform,delay])=>`<g transform="${transform}" style="--lamp-delay:${delay}"><ellipse class="diwali-lamp-glow" cy="-13" rx="47" ry="53" fill="url(#diwali-lamp-halo)"/><ellipse cy="29" rx="40" ry="4" fill="#060c12" opacity=".3"/><path d="M-43 5Q0 49 43 5Q0-4-43 5Z" fill="url(#diwali-lamp-bowl)"/><path d="M-36 12Q0 39 36 12" fill="none" stroke="#eac380" stroke-opacity=".65" stroke-width="1.4"/><ellipse cy="5" rx="43" ry="8" fill="#edc780"/><ellipse cy="5" rx="37" ry="5.3" fill="#7d3e14"/><path d="M0 6Q-3-4 0-15" fill="none" stroke="#f4dfaa" stroke-width="2.5" stroke-linecap="round"/><g class="diwali-lamp-flame"><path d="M0-60C-4-44-20-34-12-20C-6-8 9-10 14-22C20-37 5-46 0-60Z" fill="url(#diwali-lamp-fire)"/><path d="M0-42C-3-32-10-26-5-18C-2-11 7-14 7-22C7-30 2-33 0-42Z" fill="#fff7d4"/></g></g>`).join('');
 return `<div class="diwali-lamps" aria-hidden="true" data-motion-active="false"><svg viewBox="0 0 224 135" width="224" height="135" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="diwali-lamp-bowl" x2="0" y2="1"><stop stop-color="#d99b47"/><stop offset="1" stop-color="#6c3218"/></linearGradient><linearGradient id="diwali-lamp-fire" x2="0" y2="1"><stop stop-color="#fff5ca"/><stop offset=".55" stop-color="#ffc45e"/><stop offset="1" stop-color="#ed701e"/></linearGradient><radialGradient id="diwali-lamp-halo"><stop stop-color="#ffd07a" stop-opacity=".42"/><stop offset="1" stop-color="#ffd07a" stop-opacity="0"/></radialGradient></defs>${lamps}<circle class="diwali-lamp-spark" style="--lamp-delay:-1s" cx="72" cy="29" r="1.6" fill="#ffd895"/><circle class="diwali-lamp-spark" style="--lamp-delay:-2.1s" cx="153" cy="22" r="1.3" fill="#ffd895"/></svg></div>`;
}

function addDiwaliMotion($,{home=false}={}){
 $('#diwaliMotionStyles').remove();
 $('head').append('<style id="diwaliMotionStyles">'+css+'</style>');
 if(home){
  $('#diwaliSaleStyles').remove();
  $('head').append('<style id="diwaliSaleStyles">'+saleCss+'</style>');
  $('.diwali-categories').remove();
  $('.diwali-home').after(saleCategories());
  $('.home-category-grid').parent().addClass('diwali-original-categories');
  $('.diwali-home-copy .diwali-home-eyebrow').text('THE CYCLIFY DIWALI SALE / 2026');
  $('#diwaliHomeTitle').html('Diwali deals.<br>Brighter <em>rides.</em>');
  $('.diwali-home-description').text('Celebrate with a riding upgrade. Discover our ThinkRider offers and festive picks across all six collections.');
  $('.diwali-home-label').text('DIWALI SPECIAL');
  $('.diwali-home-button').html('Shop Diwali sale <span aria-hidden="true">↗</span>');
  const eyebrow=$('.diwali-home-copy .diwali-home-eyebrow').first();
  if(!eyebrow.parent().hasClass('diwali-home-intro'))eyebrow.wrap('<div class="diwali-home-intro"></div>');
  eyebrow.parent().find('.diwali-lamps').remove();
  eyebrow.parent().append(diyaScene());
  // Hidden legacy banners should not compete with the visible offer's first image.
  $('.home-hero img,.legacy-mobile-home>.offer img').attr('loading','lazy').attr('fetchpriority','low').attr('decoding','async');
 }else{
  $('.diwali-hero>.diwali-lamps').remove();
  $('.diwali-hero').append(diyaScene());
 }
}
module.exports={addDiwaliMotion};
