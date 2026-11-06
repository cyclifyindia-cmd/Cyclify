'use strict';
const discountInr=100;
function isIgpsportSource(product){return product.stockSource==='cycletime'&&/igpsport/i.test([product.brand,product.name,product.sourceHandle].join(' '));}
function applyIgpsportPricing(products){for(const p of products){if(!isIgpsportSource(p))continue;
 const source=Number(p.supplierPrice);if(!Number.isFinite(source)||source<=discountInr)throw Error('Cannot safely apply iGPSPORT discount: '+p.id);
 if(new Set((p.variants||[]).map(v=>Number(v.supplierPrice))).size>1)throw Error('Different iGPSPORT variant prices require checkout configuration: '+p.id);
 p.price=Math.round((source-discountInr)*100)/100;p.pricingPolicy='cycletime-minus-100';
 for(const v of p.variants||[]){const amount=Number(v.supplierPrice);if(!Number.isFinite(amount)||amount<=discountInr)throw Error('Invalid iGPSPORT source variant '+v.id);v.price=Math.round((amount-discountInr)*100)/100;}
 }return products;}
module.exports={isIgpsportSource,applyIgpsportPricing,discountInr};
