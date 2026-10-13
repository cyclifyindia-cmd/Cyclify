(() => {
let selectedSize='';
const quantity=document.getElementById('vookQuantity');
document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{
selectedSize=button.dataset.size;
document.querySelectorAll('[data-size]').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});
}));
document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{quantity.value=Math.max(1,Math.min(10,(Number(quantity.value)||1)+Number(button.dataset.step)));}));
quantity.addEventListener('change',()=>{quantity.value=Math.max(1,Math.min(10,Math.floor(Number(quantity.value)||1)));});
document.getElementById('geometryOpen').addEventListener('click',()=>document.getElementById('vookGeometry').showModal());
document.querySelectorAll('dialog').forEach(dialog=>{
dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
});
document.querySelectorAll('[data-preview-action]').forEach(button=>button.addEventListener('click',()=>{
const total=Number(document.getElementById('productButtons').dataset.retailPrice)*Number(quantity.value);
document.getElementById('selectionSummary').textContent=selectedSize?`Frame: ${selectedSize} · Silver / White · Quantity: ${quantity.value} · Total: ₹${total.toLocaleString('en-IN')}`:'Choose your frame size to complete your selection.';
document.getElementById('vookSelection').showModal();
}));
})();
