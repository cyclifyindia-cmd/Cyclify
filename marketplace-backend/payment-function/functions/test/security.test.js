const assert = require("node:assert/strict");
const test = require("node:test");

process.env.RAZORPAY_KEY_ID = "rzp_test_unitTestKey";
process.env.RAZORPAY_KEY_SECRET = "unit-test-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "unit-test-webhook-secret";

const { hasRecentAuthentication, validatedCart } = require("../index")._test;

test("VOOK uses the correct model price and stocked size/colour combinations", () => {
  for (const [id, price] of [[88001,155000],[88002,180000]]) {
    for (const size of ["S","M","L"]) for (const colour of id===88001?["Black","Blue","Pink","Silver"]:["Black","Blue","Pink"]) {
      const order=validatedCart([{id,size,valveLength:colour,quantity:2,price:1}]);
      assert.equal(order.total,price*2);
      assert.equal(order.items[0].size,`${size} / ${colour}`);
      if(id===88001)assert.ok(order.items[0].image.endsWith(`${colour.toLowerCase()}-${['Blue','Silver'].includes(colour)?'cutout':'first'}.png`));
    }
    assert.throws(()=>validatedCart([{id,size:"XS",valveLength:"Black"}]),/invalid/);
    assert.throws(()=>validatedCart([{id,size:"M",valveLength:"White"}]),/available frame size and colour/);
    assert.throws(()=>validatedCart([{id,size:"S"}]),/available frame size and colour/);
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
