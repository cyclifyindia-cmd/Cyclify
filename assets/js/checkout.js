import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import{getFirestore,doc,getDoc}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
const app=initializeApp({apiKey:"AIzaSyCITVZ00CZGBspP0y32AuFJjMvTk0rnr0w",authDomain:"cyclify-b809a.firebaseapp.com",projectId:"cyclify-b809a",storageBucket:"cyclify-b809a.firebasestorage.app",messagingSenderId:"748931097863",appId:"1:748931097863:web:0954f07a8245703f2751a2"});
const auth=getAuth(app);
const db=getFirestore(app);
let signedInUser=null;
let savedAddresses=[];
let fillingSavedAddress=false;
const paymentConfig=window.CYCLIFY_PAYMENT_CONFIG||{};
paymentTitle.textContent=paymentConfig.provider?`Pay securely with ${paymentConfig.provider}`:"Secure online payment";
paymentStatus.textContent=paymentConfig.enabled?"You will continue to the secure payment page.":"Online payments are temporarily unavailable. Please contact Cyclify to complete your order.";
payNow.disabled=!paymentConfig.enabled;
if(!paymentConfig.enabled)payNow.textContent="Payment unavailable";
onAuthStateChanged(auth,user=>{
 if(!user){location.replace(`account.html?return=${encodeURIComponent("checkout.html")}`);return}
 signedInUser=user;render();
});
const countries=["India","Australia","Bangladesh","Bhutan","Canada","France","Germany","Japan","Malaysia","Nepal","Netherlands","New Zealand","Singapore","Sri Lanka","United Arab Emirates","United Kingdom","United States","Other"];
const states=["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
country.innerHTML=countries.map(x=>`<option${x==="India"?" selected":""}>${x}</option>`).join("");
state.innerHTML='<option value="">Select state</option>'+states.map(x=>`<option>${x}</option>`).join("");
function syncOptionalFields(){
 billingFields.classList.toggle("hidden",sameBilling.checked);
 [billingAddress,billingCity,billingState,billingPincode].forEach(field=>field.required=!sameBilling.checked);
 gstFields.classList.toggle("hidden",!addGst.checked);
 gstin.required=addGst.checked;businessName.required=addGst.checked;
}
sameBilling.onchange=syncOptionalFields;
addGst.onchange=syncOptionalFields;
syncOptionalFields();
function updateCountryFields(value){
 const india=value==="India";
 pincode.inputMode=india?"numeric":"text";
 state.innerHTML=india?'<option value="">Select state</option>'+states.map(x=>`<option>${x}</option>`).join(""):'<option value="">Select state / province</option><option>Other</option>';
}
country.onchange=()=>updateCountryFields(country.value);
let pinTimer;
pincode.addEventListener("input",()=>{
 clearTimeout(pinTimer);pinHint.textContent="";
 if(country.value!=="India"||!/^\d{6}$/.test(pincode.value))return;
 pinHint.textContent="Finding city...";
 pinTimer=setTimeout(async()=>{
  try{
   const response=await fetch(`https://api.postalpincode.in/pincode/${pincode.value}`);
   const data=await response.json(),office=data?.[0]?.PostOffice?.[0];
   if(!office)throw new Error();
   city.value=office.District||office.Block||office.Name||"";
   if(states.includes(office.State))state.value=office.State;
   pinHint.textContent="City and state filled automatically. You can edit the city.";
  }catch{pinHint.textContent="We could not find this pincode. Please enter city and state."}
 },350);
});
function checkoutItems(){return JSON.parse(sessionStorage.getItem("cyclifyCheckoutItems")||"null")||JSON.parse(localStorage.getItem("cart")||"[]")}
function priceOf(item){return typeof item.price==="number"?item.price:Number(String(item.price).replace(/[^0-9.]/g,""))||0}
const addressFields=["country","firstName","lastName","phoneCode","phone","address","flat","pincode","city","state"];
function addressKey(value){
 return addressFields.map(key=>String(value?.[key]||"").trim().toLowerCase()).join("|");
}
function mergeAddresses(existing,current,legacy){
 const list=[current,...(Array.isArray(existing)?existing:[]),legacy].filter(Boolean);
 return list.filter((item,index)=>list.findIndex(candidate=>addressKey(candidate)===addressKey(item))===index).slice(0,10);
}
function addressLabel(value){
 const name=[value.firstName,value.lastName].filter(Boolean).join(" ");
 return [name,value.address,value.city,value.pincode].filter(Boolean).join(", ");
}
function escapeText(value){
 return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function fillAddress(value){
 fillingSavedAddress=true;
 updateCountryFields(value?.country||"India");
 addressFields.forEach(key=>{
  const field=document.getElementById(key);
  if(field)field.value=value?.[key]??(key==="phoneCode"?"+91":"");
 });
 fillingSavedAddress=false;
}
function renderSavedAddresses(){
 if(!savedAddresses.length){savedAddressWrap.classList.add("hidden");return}
 savedAddress.innerHTML=savedAddresses.map((value,index)=>`<option value="${index}">${escapeText(addressLabel(value))}</option>`).join("")+'<option value="new">Enter a new address</option>';
 savedAddressWrap.classList.remove("hidden");
 savedAddress.value="0";
 fillAddress(savedAddresses[0]);
}
savedAddress.addEventListener("change",()=>{
 if(savedAddress.value==="new"){fillAddress({country:"India",phoneCode:"+91"});return}
 fillAddress(savedAddresses[Number(savedAddress.value)]);
});
addressFields.forEach(key=>document.getElementById(key).addEventListener("input",()=>{
 if(!fillingSavedAddress&&savedAddresses.length)savedAddress.value="new";
}));
async function render(){
 const list=checkoutItems();
 if(!list.length){location.replace("cart.html");return}
 items.innerHTML=list.map(i=>`<div class="item"><img src="${i.image}" alt=""><div><p>${i.name}</p><small>Qty ${i.quantity||1}${i.size?` | ${i.size}`:""}</small></div><span class="money">Rs. ${(priceOf(i)*(i.quantity||1)).toLocaleString("en-IN")}</span></div>`).join("");
 const count=list.reduce((n,i)=>n+(i.quantity||1),0),sum=list.reduce((n,i)=>n+priceOf(i)*(i.quantity||1),0);
 itemCount.textContent=`${count} item${count===1?"":"s"}`;total.textContent=`₹${sum.toLocaleString("en-IN")}`;
 if(paymentConfig.enabled)payNow.textContent=`Pay ₹${sum.toLocaleString("en-IN")}`;
 let saved=null;
 try{
  const customer=await getDoc(doc(db,"customers",signedInUser.uid));
  if(customer.exists()){
   const data=customer.data();
   saved=data.shippingAddress||null;
   savedAddresses=mergeAddresses(data.addresses||[],saved).filter(Boolean);
  }
 }catch(error){console.error("Unable to load saved address",error)}
 if(savedAddresses.length)renderSavedAddresses();
 else if(saved)fillAddress(saved);
}
checkoutForm.addEventListener("submit",async event=>{
 event.preventDefault();formError.classList.remove("show");
 if(!checkoutForm.checkValidity()){checkoutForm.reportValidity();return}
 if(!/^[A-Za-z ]+$/.test(firstName.value)||!/^[A-Za-z ]+$/.test(lastName.value)){formError.textContent="First and last name can contain alphabets only.";formError.classList.add("show");return}
 if(!/^\+?[0-9]{1,4}$/.test(phoneCode.value.trim())||!/^[0-9 ]{6,15}$/.test(phone.value.trim())){formError.textContent="Enter a valid country code and phone number.";formError.classList.add("show");return}
 const list=checkoutItems(),addressData={};
 addressFields.forEach(id=>addressData[id]=document.getElementById(id).value.trim());
 if(!paymentConfig.enabled||!paymentConfig.createSessionUrl){formError.textContent="Online payment is not configured yet. Please contact Cyclify support.";formError.classList.add("show");return}
 const billingData=sameBilling.checked?addressData:{address:billingAddress.value.trim(),city:billingCity.value.trim(),state:billingState.value.trim(),pincode:billingPincode.value.trim()};
 const cartFingerprint=JSON.stringify(list.map(item=>[String(item.id),Number(item.quantity||1),String(item.size||item.valveLength||"")]));
 const previousFingerprint=sessionStorage.getItem("cyclifyPaymentCartFingerprint");
 const attemptId=previousFingerprint===cartFingerprint&&sessionStorage.getItem("cyclifyPaymentAttemptId")
  ?sessionStorage.getItem("cyclifyPaymentAttemptId")
  :(crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
 sessionStorage.setItem("cyclifyPaymentAttemptId",attemptId);
 sessionStorage.setItem("cyclifyPaymentCartFingerprint",cartFingerprint);
 payNow.disabled=true;payNow.textContent="Opening secure payment...";
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  const response=await fetch(paymentConfig.createSessionUrl,{
   method:"POST",
   headers:{"Authorization":`Bearer ${await signedInUser.getIdToken()}`,"Content-Type":"application/json","Idempotency-Key":attemptId},
   body:JSON.stringify({attemptId,items:list,address:addressData,billingSame:sameBilling.checked,billingAddress:billingData,gstin:addGst.checked?gstin.value.trim():"",businessName:addGst.checked?businessName.value.trim():""}),
   signal:controller.signal
  });
  clearTimeout(timeout);
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||"The payment service could not start checkout.");
  const checkoutUrl=new URL(result.checkoutUrl,location.origin);
  if(checkoutUrl.protocol!=="https:"&&checkoutUrl.origin!==location.origin)throw new Error("The payment service returned an unsafe checkout address.");
  location.assign(checkoutUrl.href);
 }catch(error){
  console.error(error);formError.textContent=error.name==="AbortError"?"The payment service took too long to respond. No charge was made. Please try again.":error.message||"We could not open secure payment. Please try again.";formError.classList.add("show");payNow.disabled=false;
  const sum=list.reduce((amount,item)=>amount+priceOf(item)*(item.quantity||1),0);
  payNow.textContent=`Pay ₹${sum.toLocaleString("en-IN")}`;
 }
});
