const Razorpay = require("razorpay");
const { createHash, createHmac, timingSafeEqual } = require("node:crypto");

class ProviderNotConfiguredError extends Error {
  constructor(message = "Razorpay is not configured.") {
    super(message);
    this.code = "provider/not-configured";
  }
}

class ProviderVerificationError extends Error {
  constructor(message = "Razorpay verification failed.") {
    super(message);
    this.code = "provider/verification-failed";
  }
}

function credentials({ webhook = false } = {}) {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  const webhookSecret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  if (!/^rzp_(?:test|live)_[A-Za-z0-9]+$/.test(keyId) || keySecret.length < 8) {
    throw new ProviderNotConfiguredError("Razorpay API credentials are missing or invalid.");
  }
  if (webhook && webhookSecret.length < 8) {
    throw new ProviderNotConfiguredError("The Razorpay webhook secret is not configured.");
  }
  return { keyId, keySecret, webhookSecret };
}

function client() {
  const { keyId, keySecret } = credentials();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function receiptFor(attemptId) {
  const clean = String(attemptId || "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!clean) throw new Error("A payment attempt id is required.");
  return `cy_${clean}`.slice(0, 40);
}

function rupeesToPaise(amount) {
  const rupees = Number(amount);
  const paise = Math.round(rupees * 100);
  if (!Number.isSafeInteger(paise) || paise < 100) throw new Error("Payment amount must be at least 100 paise.");
  return paise;
}

function paiseToRupees(amount) {
  const paise = Number(amount);
  if (!Number.isSafeInteger(paise) || paise < 0 || paise % 100 !== 0) {
    throw new ProviderVerificationError("Razorpay returned an invalid amount.");
  }
  return paise / 100;
}

function safeHexMatch(expected, received) {
  if (!/^[a-f0-9]{64}$/i.test(String(received || ""))) return false;
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(String(received), "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function assertOrderMatches(order, amount, currency, receipt) {
  if (!order || order.receipt !== receipt || Number(order.amount) !== amount || String(order.currency).toUpperCase() !== currency) {
    throw new ProviderVerificationError("An existing Razorpay order does not match this checkout.");
  }
}

async function createProviderOrder({ attemptId, amount, currency = "INR", customer = {} }) {
  const razorpay = client();
  const { keyId } = credentials();
  const amountPaise = rupeesToPaise(amount);
  const normalizedCurrency = String(currency || "INR").toUpperCase();
  const receipt = receiptFor(attemptId);
  const existing = await razorpay.orders.all({ receipt, count: 10 });
  const existingOrder = existing?.items?.find(order => order.receipt === receipt);
  if (existingOrder) {
    assertOrderMatches(existingOrder, amountPaise, normalizedCurrency, receipt);
    return { keyId, orderId: existingOrder.id, amount: amountPaise, currency: normalizedCurrency, receipt };
  }
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: normalizedCurrency,
    receipt,
    partial_payment: false,
    notes: {
      attemptId: String(attemptId),
      customerId: String(customer.uid || "").slice(0, 256),
      customerEmail: String(customer.email || "").slice(0, 256),
    },
  });
  assertOrderMatches(order, amountPaise, normalizedCurrency, receipt);
  return { keyId, orderId: order.id, amount: order.amount, currency: order.currency, receipt };
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = credentials();
  if (!orderId || !paymentId || !signature) return false;
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeHexMatch(expected, signature);
}

async function fetchProviderPayment(paymentId) {
  if (!/^pay_[A-Za-z0-9]+$/.test(String(paymentId || ""))) throw new ProviderVerificationError("Invalid Razorpay payment id.");
  return client().payments.fetch(paymentId);
}

async function orderForWebhook(razorpay, payloadOrder, payment) {
  if (payloadOrder?.id) return payloadOrder;
  if (!payment?.order_id) throw new ProviderVerificationError("The Razorpay event has no order id.");
  return razorpay.orders.fetch(payment.order_id);
}

async function paymentForWebhook(razorpay, payloadPayment, payloadOrder, refund) {
  if (payloadPayment?.id) return payloadPayment;
  if (refund?.payment_id) return razorpay.payments.fetch(refund.payment_id);
  if (payloadOrder?.id) {
    const payments = await razorpay.orders.fetchPayments(payloadOrder.id);
    return payments?.items?.find(item => item.status === "captured") || payments?.items?.[0] || null;
  }
  return null;
}

function webhookStatus(eventName, payment, refund) {
  if (eventName === "payment.captured" || eventName === "order.paid") return "paid";
  if (eventName === "payment.failed") return "failed";
  if (eventName === "refund.created") return "refund_pending";
  if (eventName === "refund.processed") {
    return Number(payment?.amount_refunded || refund?.amount || 0) >= Number(payment?.amount || 0) ? "refunded" : "refund_pending";
  }
  throw new ProviderVerificationError(`Unsupported Razorpay webhook event: ${eventName || "unknown"}.`);
}

async function verifyProviderWebhook({ headers, rawBody }) {
  const { webhookSecret } = credentials({ webhook: true });
  const signature = headers?.["x-razorpay-signature"] || headers?.["X-Razorpay-Signature"];
  if (!Buffer.isBuffer(rawBody) || !signature) throw new ProviderVerificationError("Missing Razorpay webhook signature.");
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  if (!safeHexMatch(expected, signature)) throw new ProviderVerificationError("Invalid Razorpay webhook signature.");
  let body;
  try { body = JSON.parse(rawBody.toString("utf8")); }
  catch { throw new ProviderVerificationError("Invalid Razorpay webhook body."); }
  const razorpay = client();
  const payloadPayment = body?.payload?.payment?.entity || null;
  const payloadOrder = body?.payload?.order?.entity || null;
  const refund = body?.payload?.refund?.entity || null;
  const payment = await paymentForWebhook(razorpay, payloadPayment, payloadOrder, refund);
  const order = await orderForWebhook(razorpay, payloadOrder, payment);
  const attemptId = String(order?.notes?.attemptId || order?.notes?.attempt_id || "");
  const paymentId = String(payment?.id || refund?.payment_id || "");
  if (!attemptId || !paymentId) throw new ProviderVerificationError("Razorpay event is missing Cyclify references.");
  const amount = paiseToRupees(payment.amount);
  const eventId = String(headers?.["x-razorpay-event-id"] || headers?.["X-Razorpay-Event-Id"] || createHash("sha256").update(rawBody).digest("hex"));
  return {
    verified: true,
    eventId,
    paymentId,
    attemptId,
    status: webhookStatus(body.event, payment, refund),
    amount,
    currency: String(payment.currency || order.currency || "").toUpperCase(),
  };
}

module.exports = {
  createProviderOrder,
  verifyPaymentSignature,
  fetchProviderPayment,
  verifyProviderWebhook,
  ProviderNotConfiguredError,
  ProviderVerificationError,
  _test: { credentials, receiptFor, rupeesToPaise, paiseToRupees, safeHexMatch, webhookStatus },
};
