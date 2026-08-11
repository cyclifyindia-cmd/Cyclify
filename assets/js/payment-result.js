import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import{getAuth,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import{getFirestore,doc,onSnapshot}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app=initializeApp({apiKey:"AIzaSyCITVZ00CZGBspP0y32AuFJjMvTk0rnr0w",authDomain:"cyclify-b809a.firebaseapp.com",projectId:"cyclify-b809a",storageBucket:"cyclify-b809a.firebasestorage.app",messagingSenderId:"748931097863",appId:"1:748931097863:web:0954f07a8245703f2751a2"});
const auth=getAuth(app),db=getFirestore(app);
const requestedState=document.body.dataset.resultState||"verifying";
const attemptId=new URLSearchParams(location.search).get("attempt")||"";
const title=document.getElementById("resultTitle"),message=document.getElementById("resultMessage"),icon=document.getElementById("statusIcon"),orderBox=document.getElementById("orderBox"),orderNumber=document.getElementById("orderNumber"),primary=document.getElementById("primaryAction"),secondary=document.getElementById("secondaryAction"),progress=document.getElementById("resultProgress");

function render(state,data={}){
 document.body.className=`state-${state}`;
 const content={
  verifying:["Verifying your payment","Please wait while we securely confirm the payment with the provider. Do not make another payment.","…"],
  success:["Order confirmed","Payment is verified and your Cyclify order is ready for processing.","✓"],
  cancelled:["Payment cancelled","Your cart is safe and no order has been confirmed. You can return to checkout whenever you are ready.","←"],
  failed:["Payment unsuccessful","We could not confirm this payment. Your cart is still available and you can try again safely.","!"],
 }[state]||["Payment status unavailable","We could not check this payment right now. Please contact Cyclify before trying again.","?"];
 title.textContent=content[0];message.textContent=content[1];icon.textContent=content[2];
 orderBox.classList.toggle("hidden",state!=="success");progress.classList.toggle("hidden",state!=="success");
 if(state==="success"){
  orderNumber.textContent=data.orderId||"Confirmed";
  primary.textContent="View my order";primary.href=`account.html?tab=orders${data.orderId?`&placed=${encodeURIComponent(data.orderId)}`:""}`;
  secondary.textContent="Continue shopping";secondary.href="index.html";
 }else if(state==="verifying"){
  primary.textContent="Open my account";primary.href="account.html?tab=orders";
  secondary.textContent="Contact support";secondary.href="https://wa.me/message/MLT2FFSAEYGIP1?text=Hi%20Cyclify,%20I%20need%20help%20verifying%20a%20payment";
 }else{
  primary.textContent="Return to checkout";primary.href="checkout.html";
  secondary.textContent="View cart";secondary.href="cart.html";
 }
}

render(requestedState);
if(!/^[A-Za-z0-9_-]{16,80}$/.test(attemptId)){
 render(requestedState==="success"?"verifying":requestedState);
 message.textContent="Payment reference is missing. Open your account to check whether an order was confirmed.";
}else{
 onAuthStateChanged(auth,user=>{
  if(!user){
   render(requestedState);
   message.textContent=requestedState==="verifying"?"Sign in to securely check this payment status.":`${message.textContent} Sign in to verify the final status before paying again.`;
   primary.textContent="Sign in to verify";primary.href=`account.html?return=${encodeURIComponent(`${location.pathname.split("/").pop()}?attempt=${attemptId}`)}`;
   secondary.textContent="View cart";secondary.href="cart.html";
   return;
  }
  onSnapshot(doc(db,"paymentAttempts",attemptId),snapshot=>{
   if(!snapshot.exists()){render(requestedState);return;}
   const data=snapshot.data(),state=String(data.status||"created");
   if(state==="paid"){
    localStorage.removeItem("cart");sessionStorage.removeItem("cyclifyCheckoutItems");sessionStorage.removeItem("cyclifyPaymentAttemptId");sessionStorage.removeItem("cyclifyPaymentCartFingerprint");
    window.dispatchEvent(new CustomEvent("cyclify:cart-changed",{detail:[]}));
    render("success",data);
   }else if(state==="failed"||state==="expired")render("failed",data);
   else if(state==="cancelled")render("cancelled",data);
   else if(requestedState==="cancelled")render("cancelled",data);
   else if(requestedState==="failed")render("failed",data);
   else render("verifying",data);
  },()=>{
   render(requestedState==="success"?"verifying":requestedState);
   message.textContent="We could not refresh the payment status. Check My Orders before trying another payment.";
  });
 });
}
