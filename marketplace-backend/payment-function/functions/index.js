const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { createHash } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const catalogPayload = require("./catalog.json");
const {
  createProviderOrder,
  verifyPaymentSignature,
  fetchProviderPayment,
  verifyProviderWebhook,
  ProviderNotConfiguredError,
  ProviderVerificationError,
} = require("./provider-adapter");

initializeApp();
const db = getFirestore();
const REGION = "asia-south1";
const SITE_ORIGINS = new Set(["https://cyclify.in", "https://www.cyclify.in"]);
const PAYMENT_STATES = new Set(["created", "pending", "paid", "failed", "cancelled", "expired", "refund_pending", "refunded"]);
const RAZORPAY_API_SECRETS = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];
const RAZORPAY_WEBHOOK_SECRETS = [...RAZORPAY_API_SECRETS, "RAZORPAY_WEBHOOK_SECRET"];

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
  try { return await getAuth().verifyIdToken(authorization.slice(7), true); }
  catch { return null; }
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

function endpointOptions(secrets, maxInstances = 20) {
  return { region: REGION, timeoutSeconds: 30, memory: "256MiB", maxInstances, secrets };
}

function providerHttpStatus(error) {
  const status = Number(error?.statusCode || error?.status || error?.error?.statusCode || 0);
  if (status === 401 || status === 403) return 401;
  if (error instanceof ProviderNotConfiguredError) return 503;
  if (error instanceof ProviderVerificationError) return 400;
  if (status >= 400) return 500;
  return 400;
}

function publicOrderResponse(attempt, attemptId) {
  return {
    keyId: String(process.env.RAZORPAY_KEY_ID || ""),
    orderId: attempt.providerOrderId,
    amount: Number(attempt.providerOrderAmount || Math.round(Number(attempt.amount) * 100)),
    currency: String(attempt.currency || "INR"),
    attemptId,
  };
}

exports.createRazorpayOrder = onRequest(endpointOptions(RAZORPAY_API_SECRETS), async (req, res) => {
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
    const gstin = text(req.body?.gstin, 15).toUpperCase();
    const businessName = text(req.body?.businessName, 120);
    const checkoutFingerprint = createHash("sha256").update(JSON.stringify({
      items: priced.items.map(item => [item.id, item.quantity, item.size]),
      address, billingAddress, billingSame: Boolean(req.body?.billingSame), gstin, businessName,
    })).digest("hex");
    const attemptRef = db.collection("paymentAttempts").doc(attemptId);
    const reservation = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(attemptRef);
      if (snapshot.exists) {
        const existing = snapshot.data();
        if (existing.customerId !== user.uid) throw new Error("Payment attempt belongs to another account.");
        if (existing.checkoutFingerprint && existing.checkoutFingerprint !== checkoutFingerprint) {
          throw new Error("This payment attempt belongs to different checkout details. Refresh checkout and try again.");
        }
        return existing;
      }
      const attempt = {
        attemptId, customerId: user.uid, customerEmail: user.email || "", status: "created", currency: "INR",
        amount: priced.total, items: priced.items, address, billingAddress, billingSame: Boolean(req.body?.billingSame),
        gstin, businessName, checkoutFingerprint,
        catalogGeneratedAt: catalogPayload.generatedAt, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.create(attemptRef, attempt);
      return attempt;
    });
    if (reservation.status === "paid") return send(res, 409, { error: "This payment is already complete.", attemptId });
    if (reservation.providerOrderId) return send(res, 200, publicOrderResponse(reservation, attemptId));
    const providerOrder = await createProviderOrder({
      attemptId,
      amount: reservation.amount,
      currency: "INR",
      customer: { uid: user.uid, email: user.email || "" },
    });
    await attemptRef.update({
      status: "pending",
      provider: "razorpay",
      providerOrderId: text(providerOrder.orderId, 180),
      providerOrderAmount: providerOrder.amount,
      providerOrderReceipt: text(providerOrder.receipt, 40),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return send(res, 200, { ...providerOrder, attemptId });
  } catch (error) {
    logger.error("createRazorpayOrder failed", { code: error.code, message: error.message, statusCode: error.statusCode });
    const status = providerHttpStatus(error);
    if (status === 401) return send(res, 401, { error: "Razorpay authentication failed. Rotate and reconfigure the API credentials." });
    if (status === 503) return send(res, 503, { error: "Razorpay is not configured yet." });
    if (status === 500) return send(res, 500, { error: "Razorpay could not create the order. No charge was made." });
    return send(res, 400, { error: error.message || "Payment could not be started." });
  }
});

async function finalizeVerifiedEvent(event) {
  if (!event?.verified) throw new Error("Webhook was not verified.");
  if (!event.eventId || !event.paymentId || !validAttemptId(event.attemptId) || !PAYMENT_STATES.has(event.status)) throw new Error("Invalid verified webhook event.");
  const eventDocumentId = createHash("sha256").update(String(event.eventId)).digest("hex");
  const eventRef = db.collection("paymentEvents").doc(eventDocumentId);
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
        paymentStatus: "Paid", paymentProvider: "Razorpay", paymentId: text(event.paymentId, 180), paymentAttemptId: event.attemptId,
        providerOrderId: text(attempt.providerOrderId, 180),
        currency: attempt.currency, total: attempt.amount, items: attempt.items, address: attempt.address,
        billingAddress: attempt.billingAddress, billingSame: attempt.billingSame, gstin: attempt.gstin || "", businessName: attempt.businessName || "",
        tracking: { courier: "", number: "", url: "" }, reviewableProductIds: attempt.items.map(item => String(item.id)),
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), paidAt: FieldValue.serverTimestamp(),
      });
    }
    const nextStatus = attempt.status === "paid" && !["refund_pending", "refunded"].includes(event.status) ? "paid" : event.status;
    transaction.set(eventRef, { eventId: text(event.eventId, 180), paymentId: text(event.paymentId, 180), providerOrderId: text(attempt.providerOrderId, 180), attemptId: event.attemptId, status: event.status, orderId, processedAt: FieldValue.serverTimestamp() });
    transaction.update(attemptRef, { status: nextStatus, paymentId: text(event.paymentId, 180), orderId, updatedAt: FieldValue.serverTimestamp(), ...(event.status === "paid" ? { paidAt: FieldValue.serverTimestamp() } : {}) });
    return { duplicate: false, orderId };
  });
}

exports.verifyRazorpayPayment = onRequest(endpointOptions(RAZORPAY_API_SECRETS), async (req, res) => {
  if (!cors(req, res)) return send(res, 403, { error: "Origin not allowed." });
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." });
  try {
    const user = await authenticatedUser(req);
    if (!user) return send(res, 401, { error: "Sign in again before verifying payment." });
    const attemptId = text(req.body?.attemptId, 80);
    const paymentId = text(req.body?.razorpay_payment_id, 180);
    const returnedOrderId = text(req.body?.razorpay_order_id, 180);
    const signature = text(req.body?.razorpay_signature, 180);
    if (!validAttemptId(attemptId) || !paymentId || !returnedOrderId || !signature) {
      return send(res, 400, { error: "Missing Razorpay payment verification fields." });
    }
    const attemptRef = db.collection("paymentAttempts").doc(attemptId);
    const attemptSnapshot = await attemptRef.get();
    if (!attemptSnapshot.exists) return send(res, 404, { error: "Payment attempt not found." });
    const attempt = attemptSnapshot.data();
    if (attempt.customerId !== user.uid) return send(res, 403, { error: "Payment attempt belongs to another account." });
    if (!attempt.providerOrderId || attempt.providerOrderId !== returnedOrderId) {
      return send(res, 400, { error: "Razorpay order mismatch." });
    }
    if (!verifyPaymentSignature({ orderId: attempt.providerOrderId, paymentId, signature })) {
      return send(res, 400, { error: "Payment signature verification failed." });
    }
    const payment = await fetchProviderPayment(paymentId);
    const expectedPaise = Number(attempt.providerOrderAmount || Math.round(Number(attempt.amount) * 100));
    if (payment.order_id !== attempt.providerOrderId || Number(payment.amount) !== expectedPaise || String(payment.currency).toUpperCase() !== String(attempt.currency).toUpperCase()) {
      return send(res, 400, { error: "Verified payment details do not match the Cyclify order." });
    }
    if (payment.status !== "captured" || payment.captured !== true) {
      await attemptRef.update({ status: "pending", paymentId, providerPaymentStatus: text(payment.status, 40), updatedAt: FieldValue.serverTimestamp() });
      return send(res, 409, { error: "Payment is authorised but not captured yet. Do not pay again; Cyclify is still verifying it.", attemptId });
    }
    const result = await finalizeVerifiedEvent({
      verified: true,
      eventId: `checkout:${paymentId}`,
      paymentId,
      attemptId,
      status: "paid",
      amount: Number(attempt.amount),
      currency: attempt.currency,
    });
    return send(res, 200, { success: true, attemptId, orderId: result.orderId, duplicate: result.duplicate });
  } catch (error) {
    logger.error("verifyRazorpayPayment failed", { code: error.code, message: error.message, statusCode: error.statusCode });
    const status = providerHttpStatus(error);
    if (status === 401) return send(res, 401, { error: "Razorpay authentication failed while checking the payment." });
    if (status === 503) return send(res, 503, { error: "Razorpay is not configured yet." });
    if (status === 500) return send(res, 500, { error: "Payment verification is temporarily unavailable. Do not pay again." });
    return send(res, 400, { error: error instanceof ProviderVerificationError ? error.message : "Payment verification failed." });
  }
});

exports.paymentWebhook = onRequest(endpointOptions(RAZORPAY_WEBHOOK_SECRETS, 10), async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." });
  try {
    const event = await verifyProviderWebhook({ headers: req.headers, rawBody: req.rawBody });
    const result = await finalizeVerifiedEvent(event);
    return send(res, 200, { received: true, duplicate: result.duplicate });
  } catch (error) {
    logger.error("paymentWebhook rejected", { code: error.code, message: error.message });
    if (error instanceof ProviderNotConfiguredError) return send(res, 503, { error: "Payment provider is not connected yet." });
    if (!(error instanceof ProviderVerificationError)) return send(res, 500, { error: "Webhook processing failed. Razorpay can retry safely." });
    return send(res, 400, { error: "Webhook rejected." });
  }
});

exports._test = { cleanAddress, validatedCart, validAttemptId, orderNumber, finalizeVerifiedEvent };
