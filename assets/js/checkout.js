import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,collection,runTransaction,serverTimestamp}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
const app=initializeApp({apiKey:"AIzaSyCITVZ00CZGBspP0y32AuFJjMvTk0rnr0w",authDomain:"cyclify-b809a.firebaseapp.com",projectId:"cyclify-b809a",storageBucket:"cyclify-b809a.firebasestorage.app",messagingSenderId:"748931097863",appId:"1:748931097863:web:0954f07a8245703f2751a2"});
const auth=getAuth(app);
const db=getFirestore(app);
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
async function render(){
 const list=checkoutItems();
 if(!list.length){location.replace("cart.html");return}
 items.innerHTML=list.map(i=>`<div class="item"><img src="${i.image}" alt=""><div><p>${i.name}</p><small>Qty ${i.quantity||1}${i.size?` | ${i.size}`:""}</small></div><span class="money">Rs. ${(priceOf(i)*(i.quantity||1)).toLocaleString("en-IN")}</span></div>`).join("");
 const count=list.reduce((n,i)=>n+(i.quantity||1),0),sum=list.reduce((n,i)=>n+priceOf(i)*(i.quantity||1),0);
 itemCount.textContent=count;total.textContent=`Rs. ${sum.toLocaleString("en-IN")}`;
 let saved=null;
 try{
  const customer=await getDoc(doc(db,"customers",signedInUser.uid));
  saved=customer.exists()?customer.data().shippingAddress:null;
 }catch(error){console.error("Unable to load saved address",error)}
 if(saved)for(const [key,value]of Object.entries(saved))if(document.getElementById(key))document.getElementById(key).value=value;
}
checkoutForm.addEventListener("submit",async event=>{
 event.preventDefault();formError.classList.remove("show");
 if(!checkoutForm.checkValidity()){checkoutForm.reportValidity();return}
 if(!/^[A-Za-z ]+$/.test(firstName.value)||!/^[A-Za-z ]+$/.test(lastName.value)){formError.textContent="First and last name can contain alphabets only.";formError.classList.add("show");return}
 const list=checkoutItems(),addressData={};
 ["country","firstName","lastName","address","flat","pincode","city","state"].forEach(id=>addressData[id]=document.getElementById(id).value.trim());
 const total=list.reduce((n,i)=>n+priceOf(i)*(i.quantity||1),0);
 payNow.disabled=true;payNow.textContent="Saving order...";
 try{
  const customerRef=doc(db,"customers",signedInUser.uid);
  const orderNumber=await runTransaction(db,async transaction=>{
   const customerSnapshot=await transaction.get(customerRef);
   const next=Math.max(101,Number(customerSnapshot.data()?.nextOrderNumber)||101);
   transaction.set(customerRef,{shippingAddress:addressData,nextOrderNumber:next+1,cart:[],updatedAt:serverTimestamp()},{merge:true});
   const orderRef=doc(collection(db,"customers",signedInUser.uid,"orders"));
   transaction.set(orderRef,{number:next,customerId:signedInUser.uid,status:"Order Received",createdAt:serverTimestamp(),items:list,total,address:addressData,billingSame:sameBilling.checked,billingAddress:sameBilling.checked?addressData:{address:billingAddress.value.trim(),city:billingCity.value.trim(),state:billingState.value.trim(),pincode:billingPincode.value.trim()},gstin:addGst.checked?gstin.value.trim():"",businessName:addGst.checked?businessName.value.trim():""});
   return next;
  });
  localStorage.removeItem("cart");sessionStorage.removeItem("cyclifyCheckoutItems");
  location.href=`account.html?tab=orders&placed=${orderNumber}`;
 }catch(error){
  console.error(error);formError.textContent="We could not securely save your order. Please try again.";formError.classList.add("show");payNow.disabled=false;payNow.textContent="Pay Now";
 }
});
