const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const { createHash } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const catalogPayload = require("./catalog.json");
const {
  createProviderOrder,
  createProviderRefund,
  verifyPaymentSignature,
  fetchProviderPayment,
  verifyProviderWebhook,
  ProviderNotConfiguredError,
  ProviderVerificationError,
} = require("./provider-adapter");
const {
  sendNewOrderWhatsApp,
  WhatsAppNotConfiguredError,
} = require("./whatsapp-notifier");

initializeApp();
const db = getFirestore();
const REGION = "asia-south1";
const SITE_ORIGINS = new Set(["https://cyclify.in", "https://www.cyclify.in"]);
const PAYMENT_STATES = new Set(["created", "pending", "paid", "failed", "cancelled", "expired", "refund_pending", "refunded"]);
const RAZORPAY_API_SECRETS = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];
const RAZORPAY_WEBHOOK_SECRETS = [...RAZORPAY_API_SECRETS, "RAZORPAY_WEBHOOK_SECRET"];
const WHATSAPP_SECRETS = ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ADMIN_NUMBER"];
const ADMIN_EMAIL = "admin@cyclify.in";
const ADMIN_SENSITIVE_ACTION_MAX_AGE_SECONDS = 5 * 60;

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

async function authenticatedAdmin(req) {
  const user = await authenticatedUser(req);
  if (!user) return null;
  if (String(user.email || "").toLowerCase() === ADMIN_EMAIL && user.email_verified === true) return user;
  const adminRecord = await db.collection("admins").doc(user.uid).get();
  return adminRecord.exists ? user : null;
}

function hasRecentAuthentication(user, nowSeconds = Math.floor(Date.now() / 1000)) {
  const authenticatedAt = Number(user?.auth_time);
  return Number.isFinite(authenticatedAt)
    && authenticatedAt <= nowSeconds + 30
    && nowSeconds - authenticatedAt <= ADMIN_SENSITIVE_ACTION_MAX_AGE_SECONDS;
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
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      sellingPrice: Number(product.sellingPrice || product.price),
      preorderDeposit: Number(product.preorderDeposit || 0),
      quantity,
      image: product.image,
      size,
    };
  });
  if (!Number.isSafeInteger(total) || total < 1) throw new Error("The order total is invalid.");
  return { items: cleanItems, total };
}

function validAttemptId(value) {
  return /^[A-Za-z0-9_-]{16,80}$/.test(String(value || ""));
}

function validDocumentId(value) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(String(value || ""));
}

function resolvedPaymentState(current, incoming) {
  if (current === "refunded") return "refunded";
  if (current === "refund_pending" && !["refunded"].includes(incoming)) return "refund_pending";
  if (current === "paid" && !["refund_pending", "refunded"].includes(incoming)) return "paid";
  return incoming;
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
    const nextStatus = resolvedPaymentState(attempt.status, event.status);
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
    if (["refund_pending", "refunded"].includes(event.status) && orderId) {
      const refundComplete = nextStatus === "refunded";
      const orderRef = db.collection("customers").doc(attempt.customerId).collection("orders").doc(orderId);
      transaction.update(orderRef, {
        status: refundComplete ? "Order Cancelled & Refunded" : "Order Cancellation Requested",
        paymentStatus: refundComplete ? "Refunded" : "Refund Pending",
        refundStatus: refundComplete ? "refunded" : "refund_pending",
        "refundRequest.status": refundComplete ? "completed" : "processing",
        updatedAt: FieldValue.serverTimestamp(),
        ...(refundComplete
          ? { refundedAt: FieldValue.serverTimestamp() }
          : { refundRequestedAt: FieldValue.serverTimestamp() }),
      });
    }
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

exports.cancelAndRefundOrder = onRequest(endpointOptions(RAZORPAY_API_SECRETS, 5), async (req, res) => {
  if (!cors(req, res)) return send(res, 403, { error: "Origin not allowed." });
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." });
  let orderRef = null;
  let reservation = null;
  try {
    const admin = await authenticatedAdmin(req);
    if (!admin) return send(res, 403, { error: "Cyclify administrator access is required." });
    if (!hasRecentAuthentication(admin)) return send(res, 401, { error: "Re-enter your admin password before issuing a refund." });
    const customerId = text(req.body?.customerId, 128);
    const orderId = text(req.body?.orderId, 128);
    if (!validDocumentId(customerId) || !validDocumentId(orderId)) return send(res, 400, { error: "Invalid customer or order reference." });
    orderRef = db.collection("customers").doc(customerId).collection("orders").doc(orderId);
    reservation = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new ProviderVerificationError("Order not found.");
      const order = snapshot.data();
      if (order.customerId !== customerId || String(order.number || orderId) !== orderId) throw new ProviderVerificationError("Order reference mismatch.");
      if (order.paymentStatus === "Refunded" || order.status === "Order Cancelled & Refunded") {
        return { alreadyRefunded: true };
      }
      const refundState = String(order.refundRequest?.status || "");
      if (["processing", "submitted"].includes(refundState) || order.paymentStatus === "Refund Pending") {
        return { inProgress: true };
      }
      if (order.status !== "Order Received") throw new ProviderVerificationError("Only an order that has not shipped can be cancelled automatically.");
      if (order.paymentProvider !== "Razorpay" || order.paymentStatus !== "Paid" || !order.paymentId || !order.providerOrderId) {
        throw new ProviderVerificationError("This order does not have a captured Razorpay payment available for refund.");
      }
      transaction.update(orderRef, {
        status: "Order Cancellation Requested",
        paymentStatus: "Refund Pending",
        refundStatus: "requested",
        refundRequest: {
          status: "processing",
          requestedBy: admin.uid,
          requestedByEmail: text(admin.email, 180),
          requestedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        locked: true,
        previousStatus: order.status,
        previousPaymentStatus: order.paymentStatus,
        paymentId: text(order.paymentId, 180),
        providerOrderId: text(order.providerOrderId, 180),
        amount: Number(order.total),
      };
    });
    if (reservation.alreadyRefunded) return send(res, 200, { success: true, alreadyRefunded: true, orderId });
    if (reservation.inProgress) return send(res, 202, { success: true, pending: true, orderId });
    const refund = await createProviderRefund({
      paymentId: reservation.paymentId,
      providerOrderId: reservation.providerOrderId,
      amount: reservation.amount,
      orderId,
      requestedBy: admin.uid,
    });
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("Order disappeared while recording its refund.");
      const current = snapshot.data();
      const alreadyFinal = current.paymentStatus === "Refunded" || current.status === "Order Cancelled & Refunded" || refund.alreadyRefunded;
      transaction.update(orderRef, {
        status: alreadyFinal ? "Order Cancelled & Refunded" : "Order Cancellation Requested",
        paymentStatus: alreadyFinal ? "Refunded" : "Refund Pending",
        refundStatus: alreadyFinal ? "refunded" : text(refund.status, 40),
        refundId: text(refund.refundId, 180),
        refundAmount: Number(refund.amount || reservation.amount * 100) / 100,
        "refundRequest.status": alreadyFinal ? "completed" : "submitted",
        "refundRequest.submittedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ...(alreadyFinal ? { refundedAt: FieldValue.serverTimestamp() } : {}),
      });
    });
    return send(res, 200, { success: true, pending: !refund.alreadyRefunded, orderId });
  } catch (error) {
    logger.error("cancelAndRefundOrder failed", { code: error.code, message: error.message, statusCode: error.statusCode });
    if (orderRef && reservation?.locked) {
      try {
        await db.runTransaction(async transaction => {
          const snapshot = await transaction.get(orderRef);
          if (!snapshot.exists) return;
          const current = snapshot.data();
          if (current.paymentStatus === "Refunded" || current.status === "Order Cancelled & Refunded") return;
          if (current.refundRequest?.status !== "processing") return;
          transaction.update(orderRef, {
            status: reservation.previousStatus,
            paymentStatus: reservation.previousPaymentStatus,
            refundStatus: "failed",
            "refundRequest.status": "failed",
            "refundRequest.failedAt": FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        });
      } catch (restoreError) {
        logger.error("cancelAndRefundOrder rollback failed", { message: restoreError.message });
      }
    }
    const status = providerHttpStatus(error);
    if (status === 401) return send(res, 401, { error: "Razorpay authentication failed. The order was not cancelled." });
    if (status === 503) return send(res, 503, { error: "Razorpay is not configured. The order was not cancelled." });
    if (status === 500) return send(res, 500, { error: "Razorpay could not issue the refund. The order remains active." });
    return send(res, 400, { error: error.message || "The order could not be cancelled." });
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

exports.notifyAdminNewOrder = onDocumentCreated({
  document: "customers/{customerId}/orders/{orderId}",
  region: REGION,
  timeoutSeconds: 30,
  memory: "256MiB",
  maxInstances: 5,
  secrets: WHATSAPP_SECRETS,
}, async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  const order = snapshot.data();
  if (order.paymentProvider !== "Razorpay" || order.paymentStatus !== "Paid" || !order.paymentId || !order.providerOrderId) {
    logger.warn("WhatsApp notification skipped for an unverified order", { orderId: event.params.orderId });
    return;
  }
  try {
    const reserved = await db.runTransaction(async transaction => {
      const currentSnapshot = await transaction.get(snapshot.ref);
      if (!currentSnapshot.exists) return false;
      const notificationStatus = currentSnapshot.data().adminNotifications?.whatsapp?.status;
      if (["sending", "sent"].includes(notificationStatus)) return false;
      transaction.update(snapshot.ref, {
        "adminNotifications.whatsapp.status": "sending",
        "adminNotifications.whatsapp.attempts": FieldValue.increment(1),
        "adminNotifications.whatsapp.lastAttemptAt": FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!reserved) return;
    const result = await sendNewOrderWhatsApp(order);
    await snapshot.ref.update({
      "adminNotifications.whatsapp.status": "sent",
      "adminNotifications.whatsapp.messageId": result.messageId,
      "adminNotifications.whatsapp.sentAt": FieldValue.serverTimestamp(),
      "adminNotifications.whatsapp.lastError": FieldValue.delete(),
    });
    logger.info("WhatsApp new-order notification sent", { orderId: event.params.orderId });
  } catch (error) {
    logger.error("WhatsApp new-order notification failed", {
      orderId: event.params.orderId,
      configurationError: error instanceof WhatsAppNotConfiguredError,
      message: error.message,
    });
    try {
      await snapshot.ref.update({
        "adminNotifications.whatsapp.status": "failed",
        "adminNotifications.whatsapp.lastError": String(error.message || "Notification failed.").slice(0, 240),
        "adminNotifications.whatsapp.failedAt": FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      logger.error("Could not record WhatsApp notification failure", { orderId: event.params.orderId, message: updateError.message });
    }
  }
});

exports._test = { cleanAddress, validatedCart, validAttemptId, validDocumentId, resolvedPaymentState, orderNumber, hasRecentAuthentication, finalizeVerifiedEvent };
