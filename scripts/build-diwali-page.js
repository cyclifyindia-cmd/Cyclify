'use strict';
const fs=require('node:fs'),path=require('node:path'),cheerio=require('cheerio');
const {campaign}=require('./campaign-pricing');
const {addDiwaliMotion}=require('./diwali-motion');
const root=path.resolve(__dirname,'..');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function buildDiwaliPage(products,routes,{now,write=true}={}){
 const active=campaign.isActive(now);
 const ids=[36,38,54,57,40,55,56,58,39,63,88001,88003];
 const featured=ids.map(id=>products.find(p=>Number(p.id)===id)).filter(Boolean).map(p=>campaign.resolveProduct(p,now));
 const notes={36:'Bring your riding indoors.',38:'A foldable option for your training space.',54:'Choose the right valve length for your rims.',57:'Track your heart rate during training.',40:'Add speed or cadence data to your rides.',55:'Support your front wheel indoors.',56:'Confirm drivetrain and freehub compatibility.',58:'Use the torque specified by your component maker.',39:'Check your trainer and app compatibility first.',63:'Explore frame sizes and available colours.',88001:'Electronic shifting with alloy wheels.',88003:'Choose Shimano HG or SRAM XDR.'};
 const cards=featured.map(p=>{
  const offer=campaign.offerFor(p.id,now),kind=[63,88001].includes(Number(p.id))?'carbon':Number(p.id)===88003?'wheels':'thinkrider';
  const inStock=p.available!==false;
  return `<article class="diwali-card" data-product-id="${p.id}" data-path="${kind}" data-price="${p.price}"><a href="${routes[p.id]}" data-campaign-event="campaign_product_click" data-product-id="${p.id}"><span class="diwali-card-badge">${offer?'Diwali offer':'Cyclify pick'}</span><img src="${esc(p.image)}" alt="${esc(p.name)}" width="500" height="500" loading="lazy" decoding="async"><h3>${esc(p.name)}</h3><p class="diwali-card-note">${notes[p.id]}</p><div class="diwali-card-price"><strong data-live-price>₹${campaign.formatPrice(p.price)}</strong>${offer?`<span data-regular-price>Regular <s>₹${campaign.formatPrice(offer.regularPrice)}</s></span>`:''}</div><p class="diwali-card-saving" data-live-saving>${offer?'Save ₹'+campaign.formatPrice(offer.regularPrice-p.price)+' on our regular price':'Price shown is the current selling price'}</p><div class="diwali-card-foot"><span>${inStock?'In stock':'Out of stock'}</span><b>${inStock?'Choose options':'View product'} ↗</b></div></a><button type="button" class="diwali-card-help" data-help-product="${p.id}">Check ${kind==='carbon'?'my size':'compatibility'} →</button></article>`;
 }).join('\n');
 let html=fs.readFileSync(path.join(root,'templates/diwali-deals.html'),'utf8');
 const payload=featured.map(p=>({id:p.id,name:p.name,price:p.price,available:p.available!==false,url:routes[p.id],sizes:p.sizes||[],primaryLabel:p.primaryLabel||(Number(p.id)===36||Number(p.id)===38?'Colour':'Size / option'),secondaryLabel:p.secondaryLabel||(p.valveLengths?'Valve length':'Colour'),secondaryOptions:p.secondaryOptions||p.valveLengths||[],optionsBySize:p.optionsBySize||null,sizeAvailability:p.sizeAvailability||{}}));
 const schema={'@context':'https://schema.org','@graph':[{'@type':'CollectionPage',name:'Cyclify Diwali Edit — ThinkRider Deals',url:'https://cyclify.in/diwali-deals.html',description:'ThinkRider X2 Max at ₹29,999 and 10% off other ThinkRider products. Explore cycling upgrades in the Cyclify Diwali sale.',isPartOf:{'@id':'https://cyclify.in/#website'}},{'@type':'ItemList',numberOfItems:featured.length,itemListElement:featured.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:'https://cyclify.in/'+routes[p.id]}))}]};
 html=html.replace('<!-- DIWALI_CARDS -->',cards).replace('<!-- DIWALI_DATA -->','<script>window.CYCLIFY_DIWALI_PRODUCTS='+JSON.stringify(payload).replace(/</g,'\\u003c')+';</script><script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>');
 if(!active){
  const $=cheerio.load(html);
  $('title').text('Cycling Upgrades & Current Offers | Cyclify India');
  $('meta[name="description"],meta[property="og:description"]').attr('content','Explore current Cyclify prices for ThinkRider trainers, carbon bikes, wheels and cycling accessories. The 2026 Diwali offers have ended.');
  $('meta[property="og:image"],meta[name="twitter:image"]').attr('content','https://cyclify.in/assets/products/thinkrider-x2-max-1.jpg');
  $('[data-campaign-active]').attr('hidden','');$('.diwali-ended').removeAttr('hidden');
  $('.diwali-hero .diwali-button').text('Explore current products ↗');
  $('.diwali-section-heading p').last().text('Explore bikes, wheels and ThinkRider products at current prices.');
  $('[data-filter="thinkrider"]').text('ThinkRider');
  $('#offer-terms p').first().text('The 2026 Diwali offers have ended. Product cards show current selling prices. No extra discount or free gift is implied.');
  schema['@graph'][0].description='Explore current Cyclify prices for indoor trainers, carbon bikes and cycling upgrades.';
  $('script[type="application/ld+json"]').text(JSON.stringify(schema));
  html=$.html();
 }
 const decorated=cheerio.load(html);addDiwaliMotion(decorated);html=decorated.html();
 if(write)fs.writeFileSync(path.join(root,'diwali-deals.html'),html);
 return html;
}
module.exports={buildDiwaliPage};
