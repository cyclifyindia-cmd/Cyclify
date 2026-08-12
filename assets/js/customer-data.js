import{initializeApp,getApps}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,serverTimestamp}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
const config={apiKey:"AIzaSyCITVZ00CZGBspP0y32AuFJjMvTk0rnr0w",authDomain:"cyclify-b809a.firebaseapp.com",projectId:"cyclify-b809a",storageBucket:"cyclify-b809a.firebasestorage.app",messagingSenderId:"748931097863",appId:"1:748931097863:web:0954f07a8245703f2751a2"};
const app=getApps()[0]||initializeApp(config),auth=getAuth(app),db=getFirestore(app);
let currentUser=null;
window.cyclifyCartHydrated=false;
function cartKey(item){
 return [item?.id||item?.productId||item?.name||"",item?.size||"",item?.valveLength||"",item?.variantId||""].map(String).join("|");
}
function mergeCarts(remote,local,addGuestQuantities){
 const merged=new Map();
 (Array.isArray(remote)?remote:[]).forEach(item=>merged.set(cartKey(item),{...item,quantity:Math.max(1,Number(item.quantity)||1)}));
 (Array.isArray(local)?local:[]).forEach(item=>{
  const key=cartKey(item),existing=merged.get(key),quantity=Math.max(1,Number(item.quantity)||1);
  if(!existing){merged.set(key,{...item,quantity});return}
  merged.set(key,{...existing,...item,quantity:addGuestQuantities?existing.quantity+quantity:Math.max(existing.quantity,quantity)});
 });
 return [...merged.values()];
}
const ready=new Promise(resolve=>onAuthStateChanged(auth,async user=>{
 currentUser=user;
 const previousOwner=localStorage.getItem("cyclifyCartOwner");
 if(!user){
  if(previousOwner&&previousOwner!=="guest")localStorage.removeItem("cart");
  localStorage.setItem("cyclifyCartOwner","guest");window.cyclifyCartHydrated=true;resolve(null);return
 }
 window.cyclifyCartHydrated=false;
 if(previousOwner&&previousOwner!=="guest"&&previousOwner!==user.uid)localStorage.removeItem("cart");
 const cartRef=doc(db,"customers",user.uid);
 try{
  const snapshot=await getDoc(cartRef);
  const remote=snapshot.exists()&&Array.isArray(snapshot.data().cart)?snapshot.data().cart:[];
  const local=JSON.parse(localStorage.getItem("cart")||"[]");
  const cart=mergeCarts(remote,local,previousOwner==="guest"||!previousOwner);
  localStorage.setItem("cyclifyCartOwner",user.uid);
  localStorage.setItem("cart",JSON.stringify(cart));
  if(JSON.stringify(cart)!==JSON.stringify(remote))await setDoc(cartRef,{cart,cartUpdatedAt:serverTimestamp()},{merge:true});
  window.dispatchEvent(new CustomEvent("cyclify:cart-loaded",{detail:cart}));
 }catch(error){console.error("Unable to load customer cart",error)}
 finally{window.cyclifyCartHydrated=true}
 resolve(user);
}));
window.cyclifyCustomerReady=ready;
window.cyclifySaveCart=async cart=>{
 const user=currentUser||await ready;
 if(!user)return;
 await setDoc(doc(db,"customers",user.uid),{cart,cartUpdatedAt:serverTimestamp()},{merge:true});
};
window.addEventListener("cyclify:cart-changed",event=>window.cyclifySaveCart(event.detail||[]).catch(console.error));
