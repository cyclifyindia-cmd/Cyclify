import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const config={
apiKey:"AIzaSyCITVZ00CZGBspP0y32AuFJjMvTk0rnr0w",
authDomain:"cyclify-b809a.firebaseapp.com",
projectId:"cyclify-b809a",
storageBucket:"cyclify-b809a.firebasestorage.app",
messagingSenderId:"748931097863",
appId:"1:748931097863:web:0954f07a8245703f2751a2"
};

const app=getApps()[0]||initializeApp(config);
const db=getFirestore(app);
const product=window.CYCLIFY_CURRENT_PRODUCT;

function safe(value){
return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function asDate(value){
if(!value)return null;
if(typeof value.toDate==="function")return value.toDate();
if(Number.isFinite(value.seconds))return new Date(value.seconds*1000);
const parsed=new Date(value);
return Number.isNaN(parsed.getTime())?null:parsed;
}

function validUrl(value){
return /^https?:\/\//i.test(String(value||""));
}

function stars(rating){
const value=Math.max(0,Math.min(5,Math.round(Number(rating)||0)));
return `${"&#9733;".repeat(value)}<span style="color:#d0d5dd">${"&#9733;".repeat(5-value)}</span>`;
}

function updateStructuredData(reviews,average){
const script=document.getElementById("cyclify-product-schema");
if(!script||!reviews.length)return;
try{
const data=JSON.parse(script.textContent);
const productNode=data?.["@type"]==="Product"?data:(data?.["@graph"]||[]).find(node=>node?.["@type"]==="Product");
if(!productNode)return;
productNode.aggregateRating={
"@type":"AggregateRating",
ratingValue:average.toFixed(1),
reviewCount:String(reviews.length),
bestRating:"5",
worstRating:"1"
};
productNode.review=reviews.slice(0,10).map(review=>({
"@type":"Review",
author:{"@type":"Person",name:review.userName||"Cyclify customer"},
datePublished:asDate(review.createdAt)?.toISOString().slice(0,10),
name:review.title,
reviewBody:review.comment,
reviewRating:{"@type":"Rating",ratingValue:String(review.rating),bestRating:"5",worstRating:"1"}
}));
script.textContent=JSON.stringify(data);
}catch(error){
console.warn("Product review structured data could not be updated",error);
}
}

function renderReviews(reviews){
const list=document.getElementById("productReviews");
if(!reviews.length){
list.innerHTML='<div class="reviews-empty">No customer reviews yet. Delivered-order customers can review this product from My Orders.</div>';
return;
}
const average=reviews.reduce((sum,review)=>sum+Number(review.rating||0),0)/reviews.length;
reviewSummary.hidden=false;
reviewAverage.textContent=average.toFixed(1);
reviewAverageStars.innerHTML=stars(average);
reviewCount.textContent=`${reviews.length} verified review${reviews.length===1?"":"s"}`;
ratingBars.innerHTML=[5,4,3,2,1].map(rating=>{
const count=reviews.filter(review=>Number(review.rating)===rating).length;
const percentage=Math.round(count/reviews.length*100);
return `<div class="rating-bar"><span>${rating} star</span><div class="rating-track"><div class="rating-fill" style="width:${percentage}%"></div></div><span>${count}</span></div>`;
}).join("");
list.innerHTML=reviews.map(review=>{
const date=asDate(review.createdAt);
const images=Array.isArray(review.imageUrls)?review.imageUrls.filter(validUrl):[];
return `<article class="published-review">
<div class="published-review-head"><h4>${safe(review.title)}</h4><div class="published-review-stars" aria-label="${safe(review.rating)} out of 5 stars">${stars(review.rating)}</div></div>
<div class="published-review-meta"><strong>${safe(review.userName||"Cyclify customer")}</strong><span class="verified-review">Verified purchase</span>${date?`<span>${date.toLocaleDateString("en-IN",{dateStyle:"medium"})}</span>`:""}</div>
<p>${safe(review.comment)}</p>
${images.length?`<div class="published-review-images">${images.map(url=>`<a href="${safe(url)}" target="_blank" rel="noopener"><img src="${safe(url)}" alt="Customer review photo" loading="lazy"></a>`).join("")}</div>`:""}
</article>`;
}).join("");
updateStructuredData(reviews,average);
}

async function loadReviews(){
if(!product)return;
try{
const snapshot=await getDocs(query(collection(db,"productReviews",String(product.id),"reviews"),where("status","==","approved")));
const reviews=snapshot.docs.map(item=>item.data()).sort((a,b)=>(asDate(b.createdAt)?.getTime()||0)-(asDate(a.createdAt)?.getTime()||0));
renderReviews(reviews);
}catch(error){
console.error("Approved product reviews could not be loaded",error);
document.getElementById("productReviews").innerHTML='<div class="reviews-empty">Customer reviews are temporarily unavailable.</div>';
}
}

loadReviews();
