(function () {
  'use strict';
  const engine=window.CyclifySearchEngine;
  const original=document.querySelector('#searchInput,[data-global-search]');
  if(!engine||!original||document.getElementById('cyclifySearchDialog'))return;
  const config=document.currentScript?.dataset||{};
  let pendingQuery='';try{pendingQuery=sessionStorage.getItem('pendingSearchQuery')||'';}catch(_){}
  const initialQuery=(original.value||new URLSearchParams(location.search).get('search')||pendingQuery||'').slice(0,180);
  const wasFocused=document.activeElement===original;
  const trigger=original.cloneNode(true);
  original.replaceWith(trigger);
  const box=trigger.closest('.search-box,.site-search');
  box.classList.add('cyclify-search-trigger');
  box.querySelector('.search-placeholder')?.remove();
  document.getElementById('searchResults')?.remove();
  trigger.type='search';trigger.placeholder=innerWidth<600?'Search Cyclify':'Search bikes, wheels & gear';
  trigger.value='';trigger.setAttribute('aria-label','Search all Cyclify products');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','cyclifySearchDialog');
  const searchIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.4 4.4"></path></svg>';
  const closeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>';
  const cameraIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.5h3l1.6-2h5.8l1.6 2h3v11h-15Z"></path><circle cx="12" cy="13" r="3.3"></circle></svg>';
  const leading=document.createElement('span');leading.innerHTML=searchIcon;const icon=leading.firstElementChild;icon.classList.add('cyclify-search-leading');box.prepend(icon);
  let camera=box.querySelector('.image-search-btn');
  if(camera){const next=camera.cloneNode(false);camera.replaceWith(next);camera=next;camera.innerHTML=cameraIcon;camera.setAttribute('aria-label','Find similar products by photo');}
  box.querySelectorAll('input[type=file]').forEach(node=>node.remove());

  const dialog=document.createElement('dialog');dialog.id='cyclifySearchDialog';dialog.className='cyclify-search-dialog';dialog.setAttribute('aria-labelledby','cyclifySearchTitle');
  dialog.innerHTML='<div class="cs-head"><div class="cs-topline"><h2 class="cs-title" id="cyclifySearchTitle">Find your next ride.</h2><button class="cs-close" type="button" aria-label="Close search">'+closeIcon+'</button></div><div class="cs-field">'+searchIcon+'<input class="cs-input" id="cyclifySearchQuery" type="search" placeholder="Search bikes, wheels & gear" aria-label="Search product name, brand or model" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="cs-clear" aria-label="Clear search" hidden>'+closeIcon+'</button><button type="button" class="cs-camera" aria-label="Find similar products by photo">'+cameraIcon+'</button><input class="cs-upload" type="file" accept="image/*" hidden></div></div><div class="cs-body"><div class="cs-content"></div></div>';
  document.body.appendChild(dialog);
  const input=dialog.querySelector('.cs-input'),content=dialog.querySelector('.cs-content'),body=dialog.querySelector('.cs-body'),clear=dialog.querySelector('.cs-clear'),upload=dialog.querySelector('.cs-upload');
  let catalogPromise=null,index=null,products=[],shown=12,current=[],highlight=-1,closing=false,scan=0,previewUrl='',photoMode=false;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validUrl=product=>{
    const destination=product.url||window.CYCLIFY_PRODUCT_ROUTES?.[product.id]||(Number(product.id)===990001?'tavelo-arow.html':null);
    if(!destination)return '#';
    const url=new URL(destination,location.origin+'/');
    return url.origin===location.origin?url.pathname:'#';
  };
  function money(product){
    if(product.priceOnRequest)return 'Price on request';
    const resolved=window.CyclifyCampaign?window.CyclifyCampaign.resolveProduct(product):product;
    return (product.customBuild?'From ':'')+'₹'+Number(resolved.price).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:Number.isInteger(Number(resolved.price))?0:2});
  }
  function stock(product){
    if(product.customBuild)return ['Custom build',''];
    if(product.stockStatus==='coming-soon')return ['Coming Soon','cs-unavailable'];
    if(product.stockStatus==='contact')return ['Contact for availability','cs-unavailable'];
    return product.available===false?['Out of stock','cs-out']:['In stock',''];
  }
  function rows(items){return items.map((p,i)=>{const [label,style]=stock(p);return '<a class="cs-result" data-result-index="'+i+'" href="'+esc(validUrl(p))+'"><span class="cs-photo"><img src="'+esc(new URL(p.image,location.origin+'/').href)+'" alt="" width="78" height="70" loading="lazy" decoding="async"></span><span class="cs-info"><span class="cs-category">'+esc(p.category)+'</span><strong class="cs-name">'+esc(p.name)+'</strong></span><span class="cs-meta"><strong class="cs-price">'+esc(money(p))+'</strong><span class="cs-stock '+style+'">'+label+'</span></span></a>';}).join('');}
  function paint(items,heading,note=''){
    current=items;highlight=-1;
    content.innerHTML=heading+'<div class="cs-list">'+rows(items.slice(0,shown))+'</div>'+(items.length>shown?'<button type="button" class="cs-more">Show more products · '+(items.length-shown)+' remaining</button>':'')+(note?'<p class="cs-note">'+esc(note)+'</p>':'');
    content.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.parentElement.textContent='C';},{once:true}));
  }
  function render(){
    photoMode=false;
    if(!index)return;
    clear.hidden=!input.value;shown=12;
    const query=input.value.trim();
    if(!query){
      const picks=[36,63,88001,900023].map(id=>products.find(p=>Number(p.id)===id)).filter(Boolean);
      const chips=['ThinkRider X2 Max','SAVA A7L','VOOK','Basso Venta','Carbon wheels','Helmets'];
      paint(picks,'<p class="cs-section-label">Popular searches</p><div class="cs-suggestions">'+chips.map(chip=>'<button type="button" class="cs-chip" data-query="'+esc(chip)+'">'+esc(chip)+'</button>').join('')+'</div><p class="cs-section-label">Explore Cyclify</p>');
      return;
    }
    const result=engine.search(index,query);
    const summary='<div class="cs-summary" role="status" aria-live="polite"><strong>'+result.total+' '+(result.total===1?'product':'products')+'</strong><span>'+(result.correctedQuery?'Matches for “'+esc(result.correctedQuery)+'”':'Across all collections')+'</span></div>';
    if(!result.total){current=[];content.innerHTML=summary+'<div class="cs-empty"><strong>No matches yet.</strong><p>Try the brand, model number or a shorter product name.</p></div>';return;}
    paint(result.items,summary);
  }
  function load(){
    if(catalogPromise)return catalogPromise;
    catalogPromise=new Promise((resolve,reject)=>{
      function ready(){products=window.CYCLIFY_SEARCH_PRODUCTS||[];if(!products.length){reject(new Error('empty'));return;}index=engine.createIndex(products);resolve();}
      if(window.CYCLIFY_SEARCH_PRODUCTS?.length){ready();return;}
      const script=document.createElement('script');script.src=config.catalogSrc||'/assets/js/search-index.js';script.onload=ready;script.onerror=()=>{script.remove();reject(new Error('load'));};document.head.appendChild(script);
    }).catch(error=>{catalogPromise=null;throw error;});
    return catalogPromise;
  }
  function showFailure(){content.innerHTML='<div class="cs-empty cs-error"><strong>Search is taking a moment.</strong><p>Please try loading the catalogue again.</p><button type="button" class="cs-more" data-retry>Try again</button></div>';}
  function open(query=''){
    if(closing)return;
    photoMode=false;
    if(!dialog.open){dialog.showModal();document.documentElement.classList.add('cyclify-search-open');}
    input.value=query.slice(0,180);input.focus({preventScroll:true});clear.hidden=!input.value;
    content.innerHTML='<p class="cs-loading" role="status">Loading Cyclify products…</p>';
    load().then(()=>{if(!photoMode&&dialog.open)render();}).catch(()=>{if(!photoMode&&dialog.open)showFailure();});
  }
  function close(){scan++;if(!dialog.open)return;closing=true;dialog.close();document.documentElement.classList.remove('cyclify-search-open');trigger.value='';trigger.focus({preventScroll:true});requestAnimationFrame(()=>{closing=false;});}
  trigger.addEventListener('focus',()=>open(trigger.value));
  trigger.addEventListener('click',()=>{if(!dialog.open)open();});
  camera?.addEventListener('click',()=>{open();upload.click();});
  dialog.querySelector('.cs-close').addEventListener('click',close);
  dialog.querySelector('.cs-camera').addEventListener('click',()=>upload.click());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  clear.addEventListener('click',()=>{scan++;input.value='';input.focus();render();});
  input.addEventListener('input',()=>{scan++;body.scrollTop=0;render();});
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      const links=[...content.querySelectorAll('.cs-result')];if(!links.length)return;
      event.preventDefault();highlight=Math.max(0,Math.min(links.length-1,highlight+(event.key==='ArrowDown'?1:-1)));
      links.forEach((link,i)=>link.classList.toggle('cs-highlight',i===highlight));links[highlight].scrollIntoView({block:'nearest'});
    }else if(event.key==='Enter'&&current.length&&input.value.trim()){
      event.preventDefault();location.href=validUrl(current[Math.max(0,highlight)]);
    }
  });
  content.addEventListener('click',event=>{
    const chip=event.target.closest('[data-query]');
    if(chip){scan++;input.value=chip.dataset.query;input.focus();body.scrollTop=0;render();return;}
    if(event.target.closest('[data-retry]')){open(input.value);return;}
    const more=event.target.closest('.cs-more');
    if(more&&current.length){const oldCount=shown;shown+=12;const list=content.querySelector('.cs-list');list.insertAdjacentHTML('beforeend',rows(current.slice(oldCount,shown)));if(current.length>shown)more.textContent='Show more products · '+(current.length-shown)+' remaining';else more.remove();}
  });

  // Photo matching stays in the browser; it does not upload a customer's photo.
  const signatures=new Map();
  function image(src,timeout=6500){return new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';const timer=setTimeout(()=>{img.src='';reject(new Error('timeout'));},timeout);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(new Error('image'));};img.src=src;});}
  function signature(img){
    const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,32,32);ctx.drawImage(img,0,0,32,32);
    const pixels=ctx.getImageData(0,0,32,32).data,values=[];let mean=0;
    for(let i=0;i<pixels.length;i+=4){const g=pixels[i]*.299+pixels[i+1]*.587+pixels[i+2]*.114;values.push(g);mean+=g;}
    mean/=values.length;return {values,mean};
  }
  function similarity(a,b){let score=0;for(let i=0;i<a.values.length;i++){score+=Math.abs((a.values[i]-a.mean)-(b.values[i]-b.mean));}return score/a.values.length+Math.abs(a.mean-b.mean)*.18;}
  upload.addEventListener('change',async()=>{
    const file=upload.files?.[0];upload.value='';if(!file)return;
    const token=++scan;
    photoMode=true;current=[];
    if(!file.type.startsWith('image/')||file.size>12*1024*1024){content.innerHTML='<div class="cs-empty"><strong>Choose a photo under 12 MB.</strong><p>JPG, PNG and WebP photos work best.</p></div>';return;}
    if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);
    input.value='';clear.hidden=true;
    const preview='<div class="cs-image-preview"><img src="'+esc(previewUrl)+'" alt="Your selected photo"><div><strong>Finding similar products</strong><span>Compared on your device.</span></div></div>';
    content.innerHTML=preview+'<p class="cs-loading" role="status">Loading product photos…</p>';
    try{
      await load();const target=signature(await image(previewUrl));
      let pending=[...products],done=0;const matches=[],started=performance.now();
      await Promise.all(Array.from({length:5},async()=>{
        while(pending.length&&scan===token&&performance.now()-started<26000){
          const product=pending.shift();
          try{
            let sig=signatures.get(String(product.id));
            if(!sig){sig=signature(await image(new URL(product.image,location.origin+'/').href));signatures.set(String(product.id),sig);}
            matches.push({...product,visualScore:similarity(target,sig)});
          }catch(_){}
          done++;
          if(scan===token){const status=content.querySelector('.cs-loading');if(status)status.textContent='Checking photos · '+done+' / '+products.length;}
        }
      }));
      if(scan!==token||!dialog.open)return;
      if(!matches.length){content.innerHTML=preview+'<div class="cs-empty"><strong>Try searching the model name.</strong><p>We could not compare the available photos right now.</p></div>';return;}
      shown=12;matches.sort((a,b)=>a.visualScore-b.visualScore);paint(matches.slice(0,24),preview.replace('Finding similar products','Your selected photo')+'<div class="cs-summary"><strong>Similar product photos</strong><span>'+matches.length+' compared</span></div>','Photo matching suggests similar-looking products. Search the model name for an exact match.');
    }catch(_){if(scan===token)content.innerHTML='<div class="cs-empty"><strong>We could not read that photo.</strong><p>Try a JPG, PNG or WebP image, or search by the product name.</p></div>';}
  });
  if(initialQuery||wasFocused){try{sessionStorage.removeItem('pendingSearchQuery');}catch(_){}open(initialQuery);}
})();
