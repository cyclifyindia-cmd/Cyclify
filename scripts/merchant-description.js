'use strict';
const cheerio = require('cheerio');

function plainText(value) {
  const page = cheerio.load('<div>'+String(value || '')+'</div>');
  page('script,style').remove();
  return page.root().text().replace(/\s+/g,' ').trim();
}

function merchantDescriptionFor(product) {
  const name = plainText(product.name);
  const forbidden = /the\s*bike\s*affair|thebikeaffair|wesnap|cycletime\s*india|fcc\s*racing|choosemybicycle|cyclop\.in|headwind\.in|https?:\/\/|[\w.+-]+@[\w.-]+/i;
  const commercial = /\b(?:Cyclify|shop|buy|free shipping|free delivery|discount|sale price|best price|guaranteed|dealer price)\b|₹|\bINR\s*\d|\bRs\.?\s*\d/i;
  const excludedField = /^(?:prices?|mrp|stock|availability|shipping|delivery|seller|supplier|reference|source|warranty)\s*:/i;
  const facts = [...(product.specs || []),...(product.productFeatures || [])]
    .map(plainText).filter(value=>value && value.length<=350 && !forbidden.test(value) && !commercial.test(value) && !excludedField.test(value));
  const seen = new Set();
  const parts = [name,...facts].filter(value=>{
    const key=value.toLowerCase().replace(/[\s.]+$/,'');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(value=>/[.!?]$/.test(value)?value:value+'.');
  const result=parts.join(' ');
  if (result.length<=4500) return result;
  const shortened=result.slice(0,4497);
  return shortened.slice(0,shortened.lastIndexOf(' '))+'.';
}

module.exports={merchantDescriptionFor};
