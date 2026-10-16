(function(){
 'use strict';
 const campaign=window.CyclifyCampaign;if(!campaign)return;
 const activeAtLoad=campaign.isActive();
 function decorate(){
  const active=campaign.isActive();
  if(typeof product!=='undefined'&&product?.id){
   const offer=campaign.offerFor(product.id);let note=document.getElementById('campaignProductOffer');
   if(offer&&!note){note=document.createElement('p');note.id='campaignProductOffer';note.style.cssText='font-size:12px;color:#77521d;margin:10px 0;line-height:1.6';document.getElementById('productPrice')?.after(note);}
   if(note){note.hidden=!offer;if(offer)note.textContent='Diwali offer · Regular ₹'+campaign.formatPrice(offer.regularPrice)+' · Ends 10 November, 11:59 pm IST';}
   if(!document.getElementById('cyclifyCompatibilityHelp')){
    const help=document.createElement('button');help.id='cyclifyCompatibilityHelp';help.type='button';help.textContent=/bike|frameset/i.test(product.name)?'Need help with sizing? Ask Cyclify ↗':'Check compatibility with Cyclify ↗';help.style.cssText='display:block;width:100%;border:1px solid #d8dfe4;background:#fff;padding:13px;margin:16px 0;color:#20384a;font-size:12px;cursor:pointer';
    help.addEventListener('click',()=>{const p=campaign.resolveProduct(product);const size=typeof selectedSize==='undefined'?'':selectedSize;const colour=typeof selectedValveLength==='undefined'?'':selectedValveLength;const message=['Hi Cyclify, please help me check sizing / compatibility:',p.name,'Selected option: '+(size||'Please help me choose'),colour?'Colour / secondary option: '+colour:'','Displayed price: ₹'+campaign.formatPrice(p.price),'Product: '+location.href.split('?')[0]].filter(Boolean).join('\n');window.CyclifyDiwali?.track('campaign_whatsapp_click',{product_id:p.id});window.open('https://wa.me/917418498045?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');});
    document.getElementById('productButtons')?.after(help);
   }
  }
  if(!active)return;
  document.querySelectorAll('.card:not([data-diwali-decorated])').forEach(card=>{card.dataset.diwaliDecorated='true';const link=card.querySelector('a[href*="products/"]');const id=link?.getAttribute('href')?.match(/-(\d+)\.html/)?.[1];if(!id||!campaign.offerFor(id))return;const badge=document.createElement('span');badge.textContent='DIWALI OFFER';badge.style.cssText='display:block;color:#74501c;background:#fbf4e6;font-size:9px;font-weight:700;padding:5px 8px;letter-spacing:.08em;position:absolute;top:55px;left:9px;z-index:2';card.style.position='relative';card.append(badge);});
 }
 decorate();
 const container=document.getElementById('products');if(container)new MutationObserver(decorate).observe(container,{childList:true});
 function checkExpiry(){if(campaign.isActive()!==activeAtLoad)location.reload();}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkExpiry();});
 setInterval(checkExpiry,60000);
 const remaining=Date.parse(campaign.config.endsAt)-Date.now()+1000;
 if(activeAtLoad&&remaining>0&&remaining<2147483647)setTimeout(checkExpiry,remaining);
})();
