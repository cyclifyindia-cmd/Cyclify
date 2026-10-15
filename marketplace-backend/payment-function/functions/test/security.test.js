const assert = require("node:assert/strict");
const test = require("node:test");

process.env.RAZORPAY_KEY_ID = "rzp_test_unitTestKey";
process.env.RAZORPAY_KEY_SECRET = "unit-test-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "unit-test-webhook-secret";

const { hasRecentAuthentication, validatedCart } = require("../index")._test;

test("VOOK uses the correct model price and stocked size/colour combinations", () => {
  for (const [id, price] of [[88001,155000],[88002,180000]]) {
    for (const size of ["S","M","L"]) for (const colour of ["Black","Blue","Pink","Silver"]) {
      const order=validatedCart([{id,size,valveLength:colour,quantity:2,price:1}]);
      assert.equal(order.total,price*2);
      assert.equal(order.items[0].size,`${size} / ${colour}`);
      if(id===88001)assert.ok(order.items[0].image.endsWith(`${colour.toLowerCase()}-${['Blue','Silver'].includes(colour)?'cutout':'first'}.png`));
      if(id===88002)assert.ok(order.items[0].image.endsWith(`vook-v8e-pro/${colour.toLowerCase()}-velove.png`));
    }
    assert.throws(()=>validatedCart([{id,size:"XS",valveLength:"Black"}]),/invalid/);
    assert.throws(()=>validatedCart([{id,size:"M",valveLength:"White"}]),/available frame size and colour/);
    assert.throws(()=>validatedCart([{id,size:"S"}]),/available frame size and colour/);
  }
});

test("TFSA framesets charge the full displayed price", () => {
  for (const [id, price] of [[7501,70000],[7502,65000],[7503,65000],[7504,70000],[7505,100000],[7506,45000]]) {
    const order = validatedCart([{ id, quantity: 1, price: 1, preorderDeposit: 1 }]);
    assert.equal(order.total, price);
    assert.equal(order.items[0].price, price);
    assert.equal(order.items[0].preorderDeposit, 0);
  }
});

test("A7L keeps the selected colour and rejects unavailable combinations", () => {
  const order = validatedCart([{ id: 63, size: "M", valveLength: "White", quantity: 1 }]);
  assert.equal(order.total, 129999);
  assert.equal(order.items[0].size, "M / White");
  assert.equal(order.items[0].valveLength, "White");
  assert.throws(() => validatedCart([{ id: 63, size: "S", valveLength: "Black", quantity: 1 }]), /available frame size and colour/);
  assert.throws(() => validatedCart([{ id: 63, size: "L", quantity: 1 }]), /available frame size and colour/);
});

test("requires a recently authenticated admin for sensitive actions", () => {
  const now = 1_800_000_000;
  assert.equal(hasRecentAuthentication({ auth_time: now - 60 }, now), true);
  assert.equal(hasRecentAuthentication({ auth_time: now - 300 }, now), true);
  assert.equal(hasRecentAuthentication({ auth_time: now - 301 }, now), false);
  assert.equal(hasRecentAuthentication({}, now), false);
  assert.equal(hasRecentAuthentication({ auth_time: now + 31 }, now), false);
});
