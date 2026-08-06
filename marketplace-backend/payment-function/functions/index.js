const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const catalogPayload = require("./catalog.json");
const { createProviderSession, verifyProviderWebhook, ProviderNotConfiguredError } = require("./provider-adapter");

initializeApp();
const db = getFirestore();
const REGION = "asia-south1";
const SITE_ORIGINS = new Set(["https://cyclify.in", "https://www.cyclify.in"]);
const PAYMENT_STATES = new Set(["created", "pending", "paid", "failed", "cancelled", "expired", "refund_pending", "refunded"]);

function cors(req, res) {
  const origin = req.get("origin") || "";
  if (SITE_ORIGINS.has(origin)) res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Cache-Control", "no-store");
  return !origin || SITE_ORIGINS.has(origin);
}

function send(res, status, payload) {
  return res.status(status).json(payload);
}

async function authenticatedUser(req) {
  const authorization = req.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  return getAuth().verifyIdToken(authorization.slice(7), true);
}

function text(value, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanAddress(value) {
  const address = value && typeof value === "object" ? value : {};
  const result = {
    country: text(address.country, 60), firstName: text(address.firstName, 60), lastName: text(address.lastName, 60),
    phoneCode: text(address.phoneCode, 6), phone: text(address.phone, 18), address: text(address.address, 180),
    flat: text(address.flat, 120), pincode: text(address.pincode, 12), city: text(address.city, 80), state: text(address.state, 80),
  };
  if (!result.country || !result.firstName || !result.lastName || !result.phone || !result.address || !result.pincode || !result.city || !result.state) {
    throw new Error("A complete delivery address is required.");
  }
  if (result.country === "India" && !/^\d{6}$/.test(result.pincode)) throw new Error("Enter a valid 6-digit Indian pincode.");
  if (!/^\+?\d{1,4}$/.test(result.phoneCode) || !/^\d[\d ]{5,14}$/.test(result.phone)) throw new Error("Enter a valid phone number.");
  return result;
}

function validatedCart(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) throw new Error("Your cart is empty or too large.");
  let total = 0;
  const cleanItems = items.map(item => {
    const product = catalogPayload.products[String(item?.id ?? "")];
    const quantity = Number(item?.quantity || 1);
    if (!product) throw new Error(`Product ${text(item?.id, 30)} is no longer available.`);
    if (!product.available) throw new Error(`${product.name} is currently out of stock.`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error(`Invalid quantity for ${product.name}.`);
    const size = text(item?.size || item?.valveLength, 80);
    if (size && product.sizes.length && !product.sizes.includes(size)) throw new Error(`The selected option for ${product.name} is invalid.`);
    if (size && product.sizeAvailability[size] === false) throw new Error(`${product.name} (${size}) is out of stock.`);
    total += product.price * quantity;
    return { id: product.id, name: product.name, price: product.price, quantity, image: product.image, size };
  });
  if (!Number.isSafeInteger(total) || total < 1) throw new Error("The order total is invalid.");
  return { items: cleanItems, total };
}

function validAttemptId(value) {
  return /^[A-Za-z0-9_-]{16,80}$/.test(String(value || ""));
}

function orderNumber(attemptId) {
  const day = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `CY${day}${attemptId.replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase()}`;
}

exports.createPaymentSession = onRequest({ region: REGION, timeoutSeconds: 30, memory: "256MiB", maxInstances: 20 }, async (req, res) => {
  if (!cors(req, res)) return send(res, 403, { error: "Origin not allowed." });
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." });
  try {
    const user = await authenticatedUser(req);
    if (!user) return send(res, 401, { error: "Sign in again before paying." });
    const attemptId = req.get("idempotency-key") || req.body?.attemptId;
    if (!validAttemptId(attemptId) || attemptId !== req.body?.attemptId) return send(res, 400, { error: "Invalid payment attempt." });
    const address = cleanAddress(req.body?.address);
    const billingAddress = req.body?.billingSame ? address : cleanAddress({ ...address, ...(req.body?.billingAddress || {}) });
    const priced = validatedCart(req.body?.items);
    const attemptRef = db.collection("paymentAttempts").doc(attemptId);
    const reservation = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(attemptRef);
      if (snapshot.exists) {
        const existing = snapshot.data();
        if (existing.customerId !== user.uid) throw new Error("Payment attempt belongs to another account.");
        return existing;
      }
      const attempt = {
        attemptId, customerId: user.uid, customerEmail: user.email || "", status: "created", currency: "INR",
        amount: priced.total, items: priced.items, address, billingAddress, billingSame: Boolean(req.body?.billingSame),
        gstin: text(req.body?.gstin, 15).toUpperCase(), businessName: text(req.body?.businessName, 120),
        catalogGeneratedAt: catalogPayload.generatedAt, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.create(attemptRef, attempt);
      return attempt;
    });
    if (reservation.checkoutUrl && reservation.status === "pending") return send(res, 200, { checkoutUrl: reservation.checkoutUrl, attemptId });
    if (reservation.status === "paid") return send(res, 409, { error: "This payment is already complete.", attemptId });
    const session = await createProviderSession({
      attemptId, amount: reservation.amount, currency: "INR", customer: { uid: user.uid, email: user.email || "" },
      returnUrls: {
        success: `https://cyclify.in/payment-success.html?attempt=${encodeURIComponent(attemptId)}`,
        cancel: `https://cyclify.in/payment-cancelled.html?attempt=${encodeURIComponent(attemptId)}`,
        failure: `https://cyclify.in/payment-failed.html?attempt=${encodeURIComponent(attemptId)}`,
      },
    });
    const checkoutUrl = new URL(session.checkoutUrl);
    if (checkoutUrl.protocol !== "https:") throw new Error("Provider returned an unsafe checkout URL.");
    await attemptRef.update({ status: "pending", checkoutUrl: checkoutUrl.href, providerSessionId: text(session.providerSessionId, 180), expiresAt: session.expiresAt || null, updatedAt: FieldValue.serverTimestamp() });
    return send(res, 200, { checkoutUrl: checkoutUrl.href, attemptId });
  } catch (error) {
    logger.error("createPaymentSession failed", { code: error.code, message: error.message });
    if (error instanceof ProviderNotConfiguredError) return send(res, 503, { error: "Payment provider is not connected yet." });
    return send(res, 400, { error: error.message || "Payment could not be started." });
  }
});

async function finalizeVerifiedEvent(event) {
  if (!event?.verified) throw new Error("Webhook was not verified.");
  if (!event.eventId || !event.paymentId || !validAttemptId(event.attemptId) || !PAYMENT_STATES.has(event.status)) throw new Error("Invalid verified webhook event.");
  const eventRef = db.collection("paymentEvents").doc(text(event.eventId, 180));
  const attemptRef = db.collection("paymentAttempts").doc(event.attemptId);
  return db.runTransaction(async transaction => {
    const [eventSnapshot, attemptSnapshot] = await Promise.all([transaction.get(eventRef), transaction.get(attemptRef)]);
    if (eventSnapshot.exists) return { duplicate: true, orderId: eventSnapshot.data().orderId || "" };
    if (!attemptSnapshot.exists) throw new Error("Payment attempt not found.");
    const attempt = attemptSnapshot.data();
    if (event.currency !== attempt.currency || Number(event.amount) !== Number(attempt.amount)) throw new Error("Payment amount or currency mismatch.");
    let orderId = attempt.orderId || "";
    if (event.status === "paid" && !orderId) {
      orderId = orderNumber(event.attemptId);
      const orderRef = db.collection("customers").doc(attempt.customerId).collection("orders").doc(orderId);
      transaction.create(orderRef, {
        number: orderId, customerId: attempt.customerId, customerEmail: attempt.customerEmail || "", status: "Order Received",
        paymentStatus: "Paid", paymentId: text(event.paymentId, 180), paymentAttemptId: event.attemptId,
        currency: attempt.currency, total: attempt.amount, items: attempt.items, address: attempt.address,
        billingAddress: attempt.billingAddress, billingSame: attempt.billingSame, gstin: attempt.gstin || "", businessName: attempt.businessName || "",
        tracking: { courier: "", number: "", url: "" }, reviewableProductIds: attempt.items.map(item => String(item.id)),
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), paidAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.set(eventRef, { eventId: text(event.eventId, 180), paymentId: text(event.paymentId, 180), attemptId: event.attemptId, status: event.status, orderId, processedAt: FieldValue.serverTimestamp() });
    transaction.update(attemptRef, { status: event.status, paymentId: text(event.paymentId, 180), orderId, updatedAt: FieldValue.serverTimestamp(), ...(event.status === "paid" ? { paidAt: FieldValue.serverTimestamp() } : {}) });
    return { duplicate: false, orderId };
  });
}

exports.paymentWebhook = onRequest({ region: REGION, timeoutSeconds: 30, memory: "256MiB", maxInstances: 30 }, async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." });
  try {
    const event = await verifyProviderWebhook({ headers: req.headers, rawBody: req.rawBody });
    const result = await finalizeVerifiedEvent(event);
    return send(res, 200, { received: true, duplicate: result.duplicate });
  } catch (error) {
    logger.error("paymentWebhook rejected", { code: error.code, message: error.message });
    if (error instanceof ProviderNotConfiguredError) return send(res, 503, { error: "Payment provider is not connected yet." });
    return send(res, 400, { error: "Webhook rejected." });
  }
});

exports._test = { cleanAddress, validatedCart, validAttemptId, orderNumber, finalizeVerifiedEvent };
