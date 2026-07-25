import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
const app=initializeApp({apiKey:"AIzaSyCITVZ00CZGBspP0y32AuFJjMvTk0rnr0w",authDomain:"cyclify-b809a.firebaseapp.com",projectId:"cyclify-b809a",storageBucket:"cyclify-b809a.firebasestorage.app",messagingSenderId:"748931097863",appId:"1:748931097863:web:0954f07a8245703f2751a2"});
const auth=getAuth(app);
let signedInUser=null;
onAuthStateChanged(auth,user=>{
 if(!user){location.replace(`account.html?return=${encodeURIComponent("checkout.html")}`);return}
 signedInUser=user;render();
});
const countries=["India","Australia","Bangladesh","Bhutan","Canada","France","Germany","Japan","Malaysia","Nepal","Netherlands","New Zealand","Singapore","Sri Lanka","United Arab Emirates","United Kingdom","United States","Other"];
const states=["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
country.innerHTML=countries.map(x=>`<option${x==="India"?" selected":""}>${x}</option>`).join("");
state.innerHTML='<option value="">Select state</option>'+states.map(x=>`<option>${x}</option>`).join("");
sameBilling.onchange=()=>billingFields.classList.toggle("hidden",sameBilling.checked);
addGst.onchange=()=>gstFields.classList.toggle("hidden",!addGst.checked);
country.onchange=()=>{const india=country.value==="India";pincode.inputMode=india?"numeric":"text";state.innerHTML=india?'<option value="">Select state</option>'+states.map(x=>`<option>${x}</option>`).join(""):'<option value="">Select state / province</option><option>Other</option>'};
let pinTimer;
pincode.addEventListener("input",()=>{
 clearTimeout(pinTimer);pinHint.textContent="";
 if(country.value!=="India"||!/^\d{6}$/.test(pincode.value))return;
 pinHint.textContent="Finding city…";
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
function render(){
 const list=checkoutItems();
 if(!list.length){location.replace("cart.html");return}
 items.innerHTML=list.map(i=>`<div class="item"><img src="${i.image}" alt=""><div><p>${i.name}</p><small>Qty ${i.quantity||1}${i.size?` · ${i.size}`:""}</small></div><span class="money">₹${(priceOf(i)*(i.quantity||1)).toLocaleString("en-IN")}</span></div>`).join("");
 const count=list.reduce((n,i)=>n+(i.quantity||1),0),sum=list.reduce((n,i)=>n+priceOf(i)*(i.quantity||1),0);
 itemCount.textContent=count;total.textContent=`₹${sum.toLocaleString("en-IN")}`;
 const saved=JSON.parse(localStorage.getItem(`cyclifyAddress:${signedInUser.uid}`)||"null");
 if(saved)for(const [key,value]of Object.entries(saved))if(document.getElementById(key))document.getElementById(key).value=value;
}
checkoutForm.addEventListener("submit",event=>{
 event.preventDefault();formError.classList.remove("show");
 if(!checkoutForm.checkValidity()){checkoutForm.reportValidity();return}
 if(!/^[A-Za-z ]+$/.test(firstName.value)||!/^[A-Za-z ]+$/.test(lastName.value)){formError.textContent="First and last name can contain alphabets only.";formError.classList.add("show");return}
 const list=checkoutItems(),addressData={};
 ["country","firstName","lastName","address","flat","pincode","city","state"].forEach(id=>addressData[id]=document.getElementById(id).value.trim());
 localStorage.setItem(`cyclifyAddress:${signedInUser.uid}`,JSON.stringify(addressData));
 const orders=JSON.parse(localStorage.getItem(`cyclifyOrders:${signedInUser.uid}`)||"[]");
 const globalNext=Math.max(101,Number(localStorage.getItem("cyclifyNextOrderNumber"))||101);
 const total=list.reduce((n,i)=>n+priceOf(i)*(i.quantity||1),0);
 orders.unshift({number:globalNext,status:"Your order has been received",createdAt:new Date().toISOString(),items:list,total,address:addressData,billingSame:sameBilling.checked,gstin:addGst.checked?gstin.value.trim():"",businessName:addGst.checked?businessName.value.trim():""});
 localStorage.setItem(`cyclifyOrders:${signedInUser.uid}`,JSON.stringify(orders));
 localStorage.setItem("cyclifyNextOrderNumber",String(globalNext+1));
 if(!sessionStorage.getItem("cyclifyCheckoutItems"))localStorage.setItem("cart","[]");
 sessionStorage.removeItem("cyclifyCheckoutItems");
 location.href=`account.html?tab=orders&placed=${globalNext}`;
});
