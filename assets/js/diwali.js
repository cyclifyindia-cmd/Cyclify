(function(){
 'use strict';
 const campaign=window.CyclifyCampaign;
 const money=value=>'₹'+(campaign?campaign.formatPrice(value):Number(value).toLocaleString('en-IN'));
 function track(name,data={}){
  if(!/^(campaign_[a-z_]+|add_to_cart|purchase)$/.test(name))return;
  const detail={campaign_id:'diwali-2026'};
  for(const key of ['product_id','value','section','currency','transaction_id'])if(data[key]!=null)detail[key]=data[key];
  if(typeof window.gtag==='function')window.gtag('event',name,detail);
  else if(Array.isArray(window.dataLayer))window.dataLayer.push({event:name,...detail});
  document.dispatchEvent(new CustomEvent('cyclify:campaign',{detail:{event:name,...detail}}));
  try{const key='cyclifyDiwaliSessionCounts';const counts=JSON.parse(sessionStorage.getItem(key)||'{}');counts[name]=(counts[name]||0)+1;sessionStorage.setItem(key,JSON.stringify(counts));}catch(_){}
 }
 window.CyclifyDiwali={track};
 // CSS handles each flame; JS only pauses decorations outside the visible page.
 const lamps=Array.from(document.querySelectorAll('.diwali-lamps'));
 if(lamps.length){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const visible=new Set();
  const updateMotion=()=>lamps.forEach(node=>{node.dataset.motionActive=String(visible.has(node)&&!document.hidden&&!reduced.matches);});
  if('IntersectionObserver' in window){
   const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);});updateMotion();});
   lamps.forEach(node=>observer.observe(node));
  }else{lamps.forEach(node=>visible.add(node));updateMotion();}
  document.addEventListener('visibilitychange',updateMotion);
  reduced.addEventListener?.('change',updateMotion);
 }
 document.addEventListener('click',event=>{const link=event.target.closest('[data-campaign-event]');if(link)track(link.dataset.campaignEvent,{product_id:link.dataset.productId,section:link.getAttribute('href')?.split('#')[1]});});
 const cards=Array.from(document.querySelectorAll('.diwali-card'));
 const featured=window.CYCLIFY_DIWALI_PRODUCTS||[];
 function filterCards(filter,scroll=true){
  if(!cards.length)return;
  let count=0;
  cards.forEach(card=>{const show=filter==='all'||card.dataset.path===filter||(filter==='gifts'&&Number(card.dataset.price)<5000)||(filter==='upgrades'&&card.dataset.path!=='carbon');card.hidden=!show;if(show)count++;});
  document.querySelectorAll('.diwali-filters [data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
  const status=document.getElementById('diwaliFilterStatus');if(status)status.textContent=count+' products shown';
  if(scroll)document.getElementById('thinkrider')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();filterCards(button.dataset.filter);history.replaceState(null,'','#'+button.dataset.filter);track('campaign_filter',{section:button.dataset.filter});}));
 function updateCards(){
  if(!campaign)return;
  const active=campaign.isActive();
  document.querySelectorAll('[data-campaign-active]').forEach(node=>node.hidden=!active);
  document.querySelectorAll('.diwali-ended').forEach(node=>node.hidden=active);
  cards.forEach(card=>{const source=featured.find(p=>String(p.id)===card.dataset.productId);if(!source)return;const p=campaign.resolveProduct(source);card.dataset.price=p.price;card.querySelector('[data-live-price]').textContent=money(p.price);const offer=campaign.offerFor(p.id);card.querySelector('.diwali-card-badge').textContent=offer?'Diwali offer':'Cyclify pick';const prior=card.querySelector('[data-regular-price]');if(prior)prior.hidden=!offer;card.querySelector('[data-live-saving]').textContent=offer?'Save '+money(offer.regularPrice-p.price)+' on our regular price':'Price shown is the current selling price';});
 }
 updateCards();
 if(['all','thinkrider','carbon','wheels','gifts','upgrades'].includes(location.hash.slice(1)))filterCards(location.hash.slice(1),false);
 const form=document.getElementById('diwaliHelpForm');
 if(form){
  const select=document.getElementById('diwaliProduct'),option=document.getElementById('diwaliOption'),secondary=document.getElementById('diwaliSecondary');
  featured.forEach(p=>{const element=document.createElement('option');element.value=p.id;element.textContent=p.name;select.appendChild(element);});
  const selected=()=>featured.find(p=>String(p.id)===select.value);
  function setOptions(element,values){element.replaceChildren();const undecided=document.createElement('option');undecided.value='';undecided.textContent='Help me choose';element.appendChild(undecided);values.forEach(value=>{const item=document.createElement('option');item.value=value;item.textContent=value;element.appendChild(item);});}
  function updateSecondary(){const p=selected();if(!p)return;const values=p.optionsBySize?(p.optionsBySize[option.value]||[]):p.secondaryOptions;setOptions(secondary,values);document.getElementById('diwaliSecondaryWrap').hidden=!values.length;}
  function updateHelp(){const p=selected();if(!p)return;setOptions(option,p.sizes.filter(size=>p.sizeAvailability[size]!==false));document.getElementById('diwaliOptionLabel').textContent=p.primaryLabel;document.getElementById('diwaliSecondaryLabel').textContent=p.secondaryLabel;updateSecondary();document.getElementById('diwaliHelpPrice').textContent='Displayed price: '+money(campaign?campaign.resolveProduct(p).price:p.price)+(p.available?'':' · Currently out of stock');}
  select.addEventListener('change',updateHelp);option.addEventListener('change',updateSecondary);updateHelp();
  document.querySelectorAll('[data-help-product]').forEach(button=>button.addEventListener('click',()=>{select.value=button.dataset.helpProduct;updateHelp();document.getElementById('buying-help').scrollIntoView();select.focus({preventScroll:true});track('campaign_help_open',{product_id:select.value});}));
  form.addEventListener('submit',event=>{event.preventDefault();const p=selected();if(!p)return;const text=['Hi Cyclify, I would like advice on this product:',p.name,p.primaryLabel+': '+(option.value||'Please help me choose'),secondary.value?p.secondaryLabel+': '+secondary.value:'','Displayed price: '+money(campaign?campaign.resolveProduct(p).price:p.price),'My setup / goal: '+(document.getElementById('diwaliBike').value.trim()||'Please help me choose'),'Product: https://cyclify.in/'+p.url,'Please confirm sizing or compatibility before I order.'].filter(Boolean).join('\n');track('campaign_whatsapp_click',{product_id:p.id});window.open('https://wa.me/917418498045?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');});
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCards();});
})();
