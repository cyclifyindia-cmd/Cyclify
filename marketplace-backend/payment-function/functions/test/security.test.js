const assert = require("node:assert/strict");
const test = require("node:test");

process.env.RAZORPAY_KEY_ID = "rzp_test_unitTestKey";
process.env.RAZORPAY_KEY_SECRET = "unit-test-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "unit-test-webhook-secret";

const { hasRecentAuthentication } = require("../index")._test;

test("requires a recently authenticated admin for sensitive actions", () => {
  const now = 1_800_000_000;
  assert.equal(hasRecentAuthentication({ auth_time: now - 60 }, now), true);
  assert.equal(hasRecentAuthentication({ auth_time: now - 300 }, now), true);
  assert.equal(hasRecentAuthentication({ auth_time: now - 301 }, now), false);
  assert.equal(hasRecentAuthentication({}, now), false);
  assert.equal(hasRecentAuthentication({ auth_time: now + 31 }, now), false);
});
