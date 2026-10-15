const assert = require('node:assert/strict');
const test = require('node:test');
process.env.RAZORPAY_KEY_ID = 'rzp_test_unitTestKey';
process.env.RAZORPAY_KEY_SECRET = 'unit-test-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'unit-test-webhook-secret';
const {validatedCart} = require('../index')._test;
const catalogue = require('../catalog.json').products;
const products = Object.values(catalogue).filter(product => product.purchaseVariants);
const itemFor = (product,key,variant) => ({id:product.id,variantKey:key,size:variant.size,valveLength:variant.colour,configuration:variant.build,quantity:2,price:1});

test('all expanded inventory selections use the trusted stock and selected price', () => {
  assert.equal(products.length,165);
  let available = 0;
  let unavailable = 0;
  for (const product of products) {
    for (const [key,variant] of Object.entries(product.purchaseVariants)) {
      const item = itemFor(product,key,variant);
      if (variant.available) {
        const order = validatedCart([item]);
        assert.equal(order.total,variant.price*2,product.name);
        assert.equal(order.items[0].variantKey,key);
        assert.equal(order.items[0].configuration,variant.build);
        available++;
      } else {
        assert.throws(()=>validatedCart([item]),/Coming Soon|Contact for More Info|contact Cyclify|out of stock/);
        unavailable++;
      }
    }
  }
  assert.ok(available > 0);
  assert.ok(unavailable > 0);
});

test('a cheaper selection cannot be used to buy a different build, colour or size', () => {
  const product=products.find(product=>product.available);
  const [key,variant]=Object.entries(product.purchaseVariants).find(([,variant])=>variant.available);
  const valid=itemFor(product,key,variant);
  for (const tampered of [
    {...valid,variantKey:''}, {...valid,variantKey:'not-a-real-variant'},
    {...valid,size:'not-a-real-size'}, {...valid,valveLength:'not-a-real-colour'},
    {...valid,configuration:'a-different-build'},
  ]) assert.throws(()=>validatedCart([tampered]),/valid|invalid/);
});
