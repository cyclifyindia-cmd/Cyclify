const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const test = require("node:test");

process.env.RAZORPAY_KEY_ID = "rzp_test_unitTestKey";
process.env.RAZORPAY_KEY_SECRET = "unit-test-secret";

const adapter = require("../provider-adapter");

test("converts rupees to paise and rejects amounts below one rupee", () => {
  assert.equal(adapter._test.rupeesToPaise(35_000), 3_500_000);
  assert.equal(adapter._test.rupeesToPaise(1), 100);
  assert.throws(() => adapter._test.rupeesToPaise(0.99), /at least 100 paise/);
});

test("creates a unique Razorpay-compatible receipt no longer than 40 characters", () => {
  const receipt = adapter._test.receiptFor("12345678-1234-1234-1234-123456789012");
  assert.match(receipt, /^cy_[A-Za-z0-9_-]+$/);
  assert.ok(receipt.length <= 40);
});

test("verifies the Standard Checkout HMAC using the server order id", () => {
  const orderId = "order_unitTest123";
  const paymentId = "pay_unitTest456";
  const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  assert.equal(adapter.verifyPaymentSignature({ orderId, paymentId, signature }), true);
  assert.equal(adapter.verifyPaymentSignature({ orderId, paymentId, signature: "0".repeat(64) }), false);
});

test("maps supported Razorpay webhook events to internal payment states", () => {
  assert.equal(adapter._test.webhookStatus("payment.captured", {}, {}), "paid");
  assert.equal(adapter._test.webhookStatus("payment.failed", {}, {}), "failed");
  assert.equal(adapter._test.webhookStatus("refund.created", {}, {}), "refund_pending");
  assert.equal(adapter._test.webhookStatus("refund.processed", { amount: 1000, amount_refunded: 1000 }, { amount: 1000 }), "refunded");
  assert.equal(adapter._test.webhookStatus("refund.processed", { amount: 1000, amount_refunded: 500 }, { amount: 500 }), "refund_pending");
});

test("calculates the remaining amount for full and partially refunded payments", () => {
  assert.equal(adapter._test.remainingRefundAmount({ amount: 3500000, amount_refunded: 0 }), 3500000);
  assert.equal(adapter._test.remainingRefundAmount({ amount: 3500000, amount_refunded: 500000 }), 3000000);
  assert.equal(adapter._test.remainingRefundAmount({ amount: 3500000, amount_refunded: 3500000 }), 0);
  assert.throws(() => adapter._test.remainingRefundAmount({ amount: 1000, amount_refunded: 2000 }), /invalid refund amounts/);
});
