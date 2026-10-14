(()=>{
if(!document.body.classList.contains('vook-page'))return;
if(product.imageByColour){
document.body.classList.add('vook-colour-gallery');
const frameImage=()=>{const image=document.getElementById('productImage');image.dataset.photoFraming=/(black|pink)-first\.png(?:[?#]|$)/.test(image.getAttribute('src')||'')?'original':'cutout';};
const originalShowImage=showImage;showImage=function(index){originalShowImage(index);frameImage();};
document.querySelectorAll('#productThumbs img').forEach(image=>{image.dataset.photoFraming=/(black|pink)-first\.png(?:[?#]|$)/.test(image.getAttribute('src')||'')?'original':'cutout';});
frameImage();
}
const centimetres={S:49,M:51,L:53};const colours={Black:'#191919',Blue:'#286cb5',Pink:'#e8a6ba',Silver:'#bfc2cb'};
const updateButtons=()=>{
document.querySelectorAll('#sizeOptions [data-size]').forEach(button=>{button.innerHTML=`${button.dataset.size}<small>${centimetres[button.dataset.size]} cm</small>`;button.setAttribute('aria-pressed',String(button.dataset.size===selectedSize));});
document.querySelectorAll('#valveOptions .size-btn').forEach(button=>{button.style.setProperty('--swatch',colours[button.textContent.trim()]);button.setAttribute('aria-pressed',String(button.textContent.trim()===selectedValveLength));});
};
const originalSelect=selectSize;selectSize=function(size){originalSelect(size);updateButtons();};
const originalColour=selectValveLength;selectValveLength=function(colour){
originalColour(colour);
const image=product.imageByColour&&product.imageByColour[colour];
if(image){const at=productImages.indexOf(image);if(at>=0)showImage(at);product.image=image;document.getElementById('productImage').alt=`${product.name} — ${colour}`;}
updateButtons();
};
updateButtons();
if(product.imageByColour)selectValveLength(selectedValveLength);
document.querySelectorAll('[data-vook-step]').forEach(button=>button.addEventListener('click',()=>{const input=document.getElementById('a7lQuantity');input.value=Math.max(1,Math.min(10,(Number(input.value)||1)+Number(button.dataset.vookStep)));}));
const dialog=document.getElementById('vookGeometry');
document.getElementById('geometryOpen').addEventListener('click',()=>dialog.showModal());
dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
const mrp=document.getElementById('productMrp');if(Number(product.mrp)===Number(product.price)){mrp.style.textDecoration='none';}
})();
