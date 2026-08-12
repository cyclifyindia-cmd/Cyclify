import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyCITVZ00CZGBspP0y32AuFJjMvTk0rnr0w",
  authDomain: "cyclify-b809a.firebaseapp.com",
  projectId: "cyclify-b809a",
  storageBucket: "cyclify-b809a.firebasestorage.app",
  messagingSenderId: "748931097863",
  appId: "1:748931097863:web:0954f07a8245703f2751a2",
});
const auth = getAuth(app);
const db = getFirestore(app);
const byId = id => document.getElementById(id);
const checkoutForm = byId("checkoutForm");
const payNow = byId("payNow");
const formError = byId("formError");
const paymentTitle = byId("paymentTitle");
const paymentStatus = byId("paymentStatus");
const sameBilling = byId("sameBilling");
const addGst = byId("addGst");
const addressFieldsPanel = byId("addressFieldsPanel");
const deliveryPreview = byId("deliveryPreview");
const changeAddressBtn = byId("changeAddressBtn");
const useAddressBtn = byId("useAddressBtn");
const paymentConfig = window.CYCLIFY_PAYMENT_CONFIG || {};
const paymentReady = Boolean(paymentConfig.enabled && paymentConfig.createOrderUrl && paymentConfig.verifyPaymentUrl);
let signedInUser = null;
let savedAddresses = [];
let fillingSavedAddress = false;

paymentTitle.textContent = paymentConfig.provider ? `Pay securely with ${paymentConfig.provider}` : "Secure online payment";
paymentStatus.textContent = paymentReady
  ? "Cards, UPI, netbanking and supported wallets. Your order is confirmed only after secure server verification."
  : "Online payments are temporarily unavailable. Please contact Cyclify to complete your order.";
payNow.disabled = !paymentReady;
if (!paymentReady) payNow.textContent = "Payment unavailable";

onAuthStateChanged(auth, user => {
  if (!user) {
    location.replace(`account.html?return=${encodeURIComponent("checkout.html")}`);
    return;
  }
  signedInUser = user;
  render();
});

const countries = ["India", "Australia", "Bangladesh", "Bhutan", "Canada", "France", "Germany", "Japan", "Malaysia", "Nepal", "Netherlands", "New Zealand", "Singapore", "Sri Lanka", "United Arab Emirates", "United Kingdom", "United States", "Other"];
const states = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
byId("country").innerHTML = countries.map(value => `<option${value === "India" ? " selected" : ""}>${value}</option>`).join("");
byId("state").innerHTML = '<option value="">Select state</option>' + states.map(value => `<option>${value}</option>`).join("");

function syncOptionalFields() {
  byId("billingFields").classList.toggle("hidden", sameBilling.checked);
  ["billingAddress", "billingCity", "billingState", "billingPincode"].forEach(id => { byId(id).required = !sameBilling.checked; });
  byId("gstFields").classList.toggle("hidden", !addGst.checked);
  byId("gstin").required = addGst.checked;
  byId("businessName").required = addGst.checked;
}
sameBilling.addEventListener("change", syncOptionalFields);
addGst.addEventListener("change", syncOptionalFields);
syncOptionalFields();

function updateCountryFields(value) {
  const india = value === "India";
  byId("pincode").inputMode = india ? "numeric" : "text";
  byId("state").innerHTML = india
    ? '<option value="">Select state</option>' + states.map(state => `<option>${state}</option>`).join("")
    : '<option value="">Select state / province</option><option>Other</option>';
}
byId("country").addEventListener("change", () => updateCountryFields(byId("country").value));

let pinTimer;
byId("pincode").addEventListener("input", () => {
  clearTimeout(pinTimer);
  byId("pinHint").textContent = "";
  if (byId("country").value !== "India" || !/^\d{6}$/.test(byId("pincode").value)) return;
  byId("pinHint").textContent = "Finding city...";
  pinTimer = setTimeout(async () => {
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${byId("pincode").value}`);
      const data = await response.json();
      const office = data?.[0]?.PostOffice?.[0];
      if (!office) throw new Error("Pincode not found");
      byId("city").value = office.District || office.Block || office.Name || "";
      if (states.includes(office.State)) byId("state").value = office.State;
      byId("pinHint").textContent = "City and state filled automatically. You can edit the city.";
    } catch {
      byId("pinHint").textContent = "We could not find this pincode. Please enter city and state.";
    }
  }, 350);
});

function storedJson(storage, key, fallback) {
  try { return JSON.parse(storage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}
function checkoutItems() {
  return storedJson(sessionStorage, "cyclifyCheckoutItems", null) || storedJson(localStorage, "cart", []);
}
function priceOf(item) {
  return typeof item.price === "number" ? item.price : Number(String(item.price).replace(/[^0-9.]/g, "")) || 0;
}
function cartTotal(list) {
  return list.reduce((amount, item) => amount + priceOf(item) * Number(item.quantity || 1), 0);
}
function resetPayButton(list = checkoutItems()) {
  payNow.disabled = !paymentReady;
  payNow.textContent = paymentReady ? "Pay Now" : "Payment unavailable";
}
function showError(message) {
  formError.textContent = message;
  formError.classList.add("show");
  formError.scrollIntoView({ behavior: "smooth", block: "center" });
}

const addressFields = ["fullName", "flat", "address", "pincode", "city", "state", "phoneCode", "phone", "country"];

function splitFullName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "";
  return { firstName, lastName: parts.join(" ") || firstName };
}
function canonicalAddress(value = {}) {
  const legacyName = [value.firstName, value.lastName].filter(Boolean).join(" ").trim();
  return {
    fullName: String(value.fullName || legacyName || "").trim(),
    flat: String(value.flat || "").trim(),
    address: String(value.address || "").trim(),
    pincode: String(value.pincode || "").trim(),
    city: String(value.city || "").trim(),
    state: String(value.state || "").trim(),
    phoneCode: String(value.phoneCode || "+91").trim(),
    phone: String(value.phone || "").trim(),
    country: String(value.country || "India").trim(),
  };
}
function currentAddressValue() {
  const value = {};
  addressFields.forEach(key => { value[key] = byId(key).value.trim(); });
  return canonicalAddress(value);
}
function renderDeliveryPreview(collapse = false) {
  const value = currentAddressValue();
  const complete = ["fullName", "phone", "flat", "address", "pincode", "city", "state"].every(key => value[key]);
  if (complete && collapse) {
    byId("deliveryName").textContent = value.fullName;
    byId("deliveryAddress").textContent = [value.flat, value.address, value.city, value.state, value.pincode, value.country].filter(Boolean).join(", ");
    byId("deliveryPhone").textContent = `${value.phoneCode} ${value.phone}`.trim();
    deliveryPreview.classList.remove("hidden");
    addressFieldsPanel.classList.add("hidden");
  } else {
    deliveryPreview.classList.add("hidden");
    addressFieldsPanel.classList.remove("hidden");
  }
}
function showAddressRequired(invalid) {
  renderDeliveryPreview(false);
  showError(savedAddresses.length
    ? "Please fill your delivery address or select a saved address."
    : "Please fill your delivery address before continuing to payment.");
  invalid?.focus();
}
changeAddressBtn.addEventListener("click", () => {
  renderDeliveryPreview(false);
  byId("fullName").focus();
});
useAddressBtn.addEventListener("click", () => {
  const invalid = addressFields.map(byId).find(field => !field.checkValidity());
  if (invalid) { showAddressRequired(invalid); invalid.reportValidity(); return; }
  renderDeliveryPreview(true);
  byId("addressEditor").scrollIntoView({ behavior: "smooth", block: "start" });
});

function addressKey(value) {
  const canonical = canonicalAddress(value);
  return addressFields.map(key => String(canonical[key] || "").trim().toLowerCase()).join("|");
}
function mergeAddresses(existing, current, legacy) {
  const list = [current, ...(Array.isArray(existing) ? existing : []), legacy].filter(Boolean).map(canonicalAddress);
  return list.filter((item, index) => list.findIndex(candidate => addressKey(candidate) === addressKey(item)) === index).slice(0, 10);
}
function addressLabel(value) {
  const canonical = canonicalAddress(value);
  return [canonical.fullName, canonical.address, canonical.city, canonical.pincode].filter(Boolean).join(", ");
}
function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function fillAddress(value) {
  fillingSavedAddress = true;
  const canonical = canonicalAddress(value);
  updateCountryFields(canonical.country);
  addressFields.forEach(key => {
    const field = byId(key);
    if (field) field.value = canonical[key];
  });
  fillingSavedAddress = false;
  renderDeliveryPreview(Boolean(canonical.address));
}
function renderSavedAddresses() {
  if (!savedAddresses.length) {
    byId("savedAddressWrap").classList.add("hidden");
    return;
  }
  byId("savedAddress").innerHTML = savedAddresses.map((value, index) => `<option value="${index}">${escapeText(addressLabel(value))}</option>`).join("") + '<option value="new">Enter a new address</option>';
  byId("savedAddressWrap").classList.remove("hidden");
  byId("savedAddress").value = "0";
  fillAddress(savedAddresses[0]);
}
byId("savedAddress").addEventListener("change", () => {
  if (byId("savedAddress").value === "new") {
    fillAddress({ country: "India", phoneCode: "+91" });
    renderDeliveryPreview(false);
  } else fillAddress(savedAddresses[Number(byId("savedAddress").value)]);
});
addressFields.forEach(key => byId(key).addEventListener("input", () => {
  if (!fillingSavedAddress && savedAddresses.length) byId("savedAddress").value = "new";
  if (!fillingSavedAddress) renderDeliveryPreview(false);
}));

async function render() {
  const list = checkoutItems();
  if (!list.length) {
    location.replace("cart.html");
    return;
  }
  byId("items").innerHTML = list.map(item => `<div class="item"><img src="${escapeText(item.image)}" alt=""><div><p>${escapeText(item.name)}</p><small>Qty ${Number(item.quantity || 1)}${item.size ? ` | ${escapeText(item.size)}` : ""}</small></div><span class="money">\u20B9${(priceOf(item) * Number(item.quantity || 1)).toLocaleString("en-IN")}</span></div>`).join("");
  const count = list.reduce((number, item) => number + Number(item.quantity || 1), 0);
  byId("itemCount").textContent = `${count} item${count === 1 ? "" : "s"}`;
  byId("total").textContent = `\u20B9${cartTotal(list).toLocaleString("en-IN")}`;
  resetPayButton(list);
  let saved = null;
  try {
    const customer = await getDoc(doc(db, "customers", signedInUser.uid));
    if (customer.exists()) {
      const data = customer.data();
      saved = data.shippingAddress || null;
      savedAddresses = mergeAddresses(data.addresses || [], saved).filter(Boolean);
    }
  } catch (error) {
    console.error("Unable to load saved address", error);
  }
  if (savedAddresses.length) renderSavedAddresses();
  else if (saved) fillAddress(saved);
}

async function fetchJson(url, options, timeoutMs = 25_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "The payment service could not complete this request.");
      error.httpStatus = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function checkoutResultIsValid(result) {
  return /^rzp_(?:test|live)_[A-Za-z0-9]+$/.test(String(result?.keyId || ""))
    && /^order_[A-Za-z0-9]+$/.test(String(result?.orderId || ""))
    && Number.isSafeInteger(Number(result?.amount))
    && Number(result.amount) >= 100
    && String(result?.currency || "").toUpperCase() === "INR";
}

checkoutForm.addEventListener("submit", async event => {
  event.preventDefault();
  formError.classList.remove("show");
  const invalidAddress = addressFields.map(byId).find(field => !field.checkValidity());
  if (invalidAddress) {
    showAddressRequired(invalidAddress);
    invalidAddress.reportValidity();
    return;
  }
  if (!checkoutForm.checkValidity()) {
    checkoutForm.reportValidity();
    return;
  }
  if (!/^[A-Za-z .'-]+$/.test(byId("fullName").value.trim())) {
    showError("Enter a valid full name.");
    return;
  }
  if (!/^\+?[0-9]{1,4}$/.test(byId("phoneCode").value.trim()) || !/^[0-9 ]{6,15}$/.test(byId("phone").value.trim())) {
    showError("Enter a valid country code and phone number.");
    return;
  }
  if (!paymentReady || typeof window.Razorpay !== "function") {
    showError("Secure Razorpay Checkout could not load. Check your connection and try again.");
    return;
  }

  const list = checkoutItems();
  const addressData = currentAddressValue();
  Object.assign(addressData, splitFullName(addressData.fullName));
  const billingData = sameBilling.checked ? addressData : {
    address: byId("billingAddress").value.trim(),
    city: byId("billingCity").value.trim(),
    state: byId("billingState").value.trim(),
    pincode: byId("billingPincode").value.trim(),
  };
  const requestPayload = {
    items: list,
    address: addressData,
    billingSame: sameBilling.checked,
    billingAddress: billingData,
    gstin: addGst.checked ? byId("gstin").value.trim() : "",
    businessName: addGst.checked ? byId("businessName").value.trim() : "",
  };
  const fingerprint = JSON.stringify({
    items: list.map(item => [String(item.id), Number(item.quantity || 1), String(item.size || item.valveLength || "")]),
    address: addressData,
    billingSame: requestPayload.billingSame,
    billingAddress: billingData,
    gstin: requestPayload.gstin,
    businessName: requestPayload.businessName,
  });
  const previousFingerprint = sessionStorage.getItem("cyclifyPaymentCartFingerprint");
  const attemptId = previousFingerprint === fingerprint && sessionStorage.getItem("cyclifyPaymentAttemptId")
    ? sessionStorage.getItem("cyclifyPaymentAttemptId")
    : (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
  sessionStorage.setItem("cyclifyPaymentAttemptId", attemptId);
  sessionStorage.setItem("cyclifyPaymentCartFingerprint", fingerprint);
  payNow.disabled = true;
  payNow.textContent = "Preparing secure payment...";

  try {
    const token = await signedInUser.getIdToken();
    const order = await fetchJson(paymentConfig.createOrderUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": attemptId },
      body: JSON.stringify({ ...requestPayload, attemptId }),
    });
    if (!checkoutResultIsValid(order)) throw new Error("Razorpay returned an invalid checkout order. No charge was made.");

    let paymentFailed = false;
    let verificationStarted = false;
    const razorpay = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "CYCLIFY INDIA",
      description: "Cyclify secure checkout",
      image: "https://cyclify.in/assets/Logo-original.png",
      prefill: {
        name: `${addressData.firstName} ${addressData.lastName}`.trim(),
        email: signedInUser.email || "",
        contact: `${addressData.phoneCode}${addressData.phone}`.replace(/\s+/g, ""),
      },
      notes: { payment_attempt: attemptId },
      theme: { color: "#ff5a00", backdrop_color: "#17211b" },
      retry: { enabled: true, max_count: 2 },
      modal: {
        confirm_close: true,
        escape: false,
        ondismiss: () => {
          if (verificationStarted) return;
          location.assign(`${paymentFailed ? "payment-failed.html" : "payment-cancelled.html"}?attempt=${encodeURIComponent(attemptId)}`);
        },
      },
      handler: async payment => {
        verificationStarted = true;
        payNow.disabled = true;
        payNow.textContent = "Verifying payment...";
        try {
          const verification = await fetchJson(paymentConfig.verifyPaymentUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${await signedInUser.getIdToken()}`, "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId, ...payment }),
          }, 30_000);
          if (!verification.success) throw new Error("Payment confirmation is still pending.");
          location.replace(`payment-success.html?attempt=${encodeURIComponent(attemptId)}`);
        } catch (error) {
          console.error("Razorpay verification pending", error);
          location.replace(`payment-success.html?attempt=${encodeURIComponent(attemptId)}`);
        }
      },
    });
    razorpay.on("payment.failed", response => {
      paymentFailed = true;
      const reason = response?.error?.description || "Razorpay could not complete this payment.";
      showError(`${reason} Your cart is safe. You may close the payment window and try again.`);
      resetPayButton(list);
    });
    payNow.textContent = "Complete payment securely";
    razorpay.open();
  } catch (error) {
    console.error(error);
    if (error.httpStatus === 409 && error.data?.attemptId) {
      location.assign(`payment-success.html?attempt=${encodeURIComponent(error.data.attemptId)}`);
      return;
    }
    showError(error.name === "AbortError"
      ? "The payment service took too long to respond. No charge was made. Please try again."
      : error.message || "We could not open secure payment. Please try again.");
    resetPayButton(list);
  }
});
