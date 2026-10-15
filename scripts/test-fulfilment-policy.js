'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const {deliveryFor, deliverySchemaFor, assertMerchantAvailability} = require('./fulfilment-policy');
const root = path.resolve(__dirname,'..');
assert.deepEqual(deliveryFor({id:900177,available:true}).transit,{min:3,max:3});
for (const id of [7501,7502,7503,7504,7505,7506]) {
  assert.deepEqual(deliveryFor({id,available:true,deliveryText:'Delivery in 10–12 days'}).transit,{min:10,max:12});
  assert.deepEqual(deliveryFor({id,available:true}).handling,{min:0,max:0});
}
for (const product of [{available:false},{preorder:true},{priceOnRequest:true},{deliveryText:'Confirm custom build lead time'}]) {
  assert.equal(deliveryFor(product),null);
  assert.equal(deliverySchemaFor(product),null);
}
assert.throws(()=>assertMerchantAvailability({id:7501,preorder:true}),/confirmed availabilityDate/);
assert.doesNotThrow(()=>assertMerchantAvailability({id:7501,preorder:true,availabilityDate:'2026-12-01T12:00:00+05:30'}));
const feed = cheerio.load(fs.readFileSync(path.join(root,'google-merchant-feed.xml'),'utf8'),{xml:true});
let checked = 0;
feed('item').each((_,element)=>{
  const item=feed(element);
  const id=Number(item.find('g\\:id').text().replace('CYCLIFY-',''));
  const availability=item.find('g\\:availability').text();
  const link=item.find('link').text();
  const file=path.join(root,new URL(link).pathname.slice(1));
  const page=cheerio.load(fs.readFileSync(file,'utf8'));
  const graph=JSON.parse(page('#cyclify-product-schema').html())['@graph'];
  const product=graph.find(entity=>entity['@type']==='Product');
  const time=product.offers?.shippingDetails?.deliveryTime;
  if (availability==='preorder') assert.ok(item.find('g\\:availability_date').text(),id+': pre-order date');
  if (availability==='out_of_stock') {
    assert.equal(item.find('g\\:min_handling_time').length,0,id+': no unconfirmed dispatch promise');
  }
  if (time) {
    checked++;
    const expected=[7501,7502,7503,7504,7505,7506].includes(id)?{min:10,max:12}:{min:3,max:3};
    assert.equal(time.transitTime.minValue,expected.min,id+': structured transit minimum');
    assert.equal(time.transitTime.maxValue,expected.max,id+': structured transit maximum');
    assert.equal(item.find('g\\:min_handling_time').text(),'0',id+': feed handling');
    assert.equal(item.find('g\\:max_handling_time').text(),'0',id+': feed handling');
    assert.equal(item.find('g\\:min_transit_time').text(),String(expected.min),id+': feed transit');
    assert.equal(item.find('g\\:max_transit_time').text(),String(expected.max),id+': feed transit');
  }
  if ([7501,7502,7503,7504,7505,7506].includes(id)) {
    assert.equal(availability,'in_stock');
    assert.ok(time,id+': missing confirmed delivery estimate');
    assert.equal(item.find('g\\:shipping_label').text(),'tfsa-10-12-days');
  }
});
assert.ok(checked>6);
console.log('Confirmed shipping verified for '+checked+' available product offers: standard 3 days, TFSA 10–12 days; no invented pre-order dates.');
