'use strict';
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../assets/css/diwali-motion.css'),'utf8');
const saleCss=fs.readFileSync(path.join(__dirname,'../assets/css/diwali-sale.css'),'utf8');

function saleCategories(){
 const cards=[
  ['bikes-frames.html','Bikes &amp; Frames','A new ride. A new beginning.','assets/products/sava-a7l-2026/blue-side.jpg','SAVA A7L blue carbon road bike'],
  ['wheels-tyres.html','Wheels &amp; Tyres','Make every kilometre count.','assets/products/pertual-sharp-gr/wheelset-angled.webp','PERTUAL carbon wheelset photographed by Cyclify'],
  ['electronics.html','Electronics','Light up your training.','assets/products/igpsport-igs800-device.webp','iGPSPORT iGS800 cycling computer'],
  ['components.html','Components','The details make the ride.','assets/products/expanded/11aa231dd6f26ec8f8.webp','Selle Italia SLR Boost TM Superflow saddle'],
  ['wearables.html','Apparel &amp; Wearables','Ready for your festive ride.','assets/products/expanded/f97e04cc85cadd287b.webp','Rudy Project Nytron cycling helmet'],
  ['accessories.html','Accessories','Little gifts. More happy miles.','assets/products/expanded/cd64e087107dbcbc7c.webp','Controltech Rib bottle cage']
 ];
 return `<section class="diwali-categories" aria-labelledby="diwaliCategoryTitle"><div class="diwali-categories-inner"><header><div><p class="diwali-sale-kicker">THE FESTIVAL OF LIGHTS. THE JOY OF RIDING.</p><h2 id="diwaliCategoryTitle">Your Diwali. <em>Your next upgrade.</em></h2></div><a href="diwali-deals.html">Explore Diwali offers <span aria-hidden="true">↗</span></a></header><div class="diwali-category-grid">${cards.map(([url,name,copy,src,alt],i)=>`<a class="diwali-category-card" href="${url}" data-campaign-event="campaign_category_click"><div class="diwali-category-top"><span>DIWALI EDIT</span><b aria-hidden="true">0${i+1}</b></div><div class="diwali-category-photo"><img src="${src}" alt="${alt}" width="600" height="450" loading="lazy" decoding="async"></div><div class="diwali-category-copy"><h3>${name}</h3><p>${copy}</p><span>Shop collection <b aria-hidden="true">↗</b></span></div></a>`).join('')}</div><p class="diwali-category-note">ThinkRider X2 Max ₹29,999 · 10% off other ThinkRider products · Explore current prices across every collection.</p></div></section>`;
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
