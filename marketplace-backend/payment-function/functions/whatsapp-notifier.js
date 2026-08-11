const GRAPH_API_VERSION = "v23.0";
const DEFAULT_TEMPLATE_NAME = "cyclify_new_paid_order";
const DEFAULT_TEMPLATE_LANGUAGE = "en_US";

class WhatsAppNotConfiguredError extends Error {
  constructor(message = "WhatsApp order notifications are not configured.") {
    super(message);
    this.name = "WhatsAppNotConfiguredError";
  }
}

class WhatsAppDeliveryError extends Error {
  constructor(message = "WhatsApp rejected the order notification.") {
    super(message);
    this.name = "WhatsAppDeliveryError";
  }
}

function requiredEnvironment(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new WhatsAppNotConfiguredError(`${name} is missing.`);
  return value;
}

function normalizedWhatsAppNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(digits)) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_ADMIN_NUMBER must include the country code and digits only.");
  }
  return digits;
}

function formattedRupees(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 1) throw new WhatsAppDeliveryError("The order total is invalid.");
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function productSummary(items) {
  if (!Array.isArray(items) || !items.length) return "View products in the Cyclify Admin Panel";
  const summary = items
    .slice(0, 4)
    .map(item => `${String(item?.name || "Product").trim().slice(0, 60)} × ${Math.max(1, Number(item?.quantity) || 1)}`)
    .join(", ");
  return `${summary}${items.length > 4 ? ` +${items.length - 4} more` : ""}`.slice(0, 240);
}

function templatePayload(order) {
  const number = String(order?.number || "").trim().slice(0, 80);
  if (!number) throw new WhatsAppDeliveryError("The order number is missing.");
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedWhatsAppNumber(requiredEnvironment("WHATSAPP_ADMIN_NUMBER")),
    type: "template",
    template: {
      name: DEFAULT_TEMPLATE_NAME,
      language: { code: DEFAULT_TEMPLATE_LANGUAGE },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: number },
          { type: "text", text: formattedRupees(order.total) },
          { type: "text", text: productSummary(order.items) },
        ],
      }],
    },
  };
}

async function sendNewOrderWhatsApp(order, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new WhatsAppDeliveryError("The HTTPS client is unavailable.");
  const accessToken = requiredEnvironment("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = requiredEnvironment("WHATSAPP_PHONE_NUMBER_ID");
  if (!/^\d{5,30}$/.test(phoneNumberId)) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_PHONE_NUMBER_ID is invalid.");
  }
  const response = await fetchImpl(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(templatePayload(order)),
  });
  let responsePayload = {};
  try { responsePayload = await response.json(); }
  catch { responsePayload = {}; }
  if (!response.ok) {
    const metaCode = String(responsePayload?.error?.code || response.status || "unknown").slice(0, 30);
    const metaMessage = String(responsePayload?.error?.message || "Message was not accepted.").slice(0, 180);
    throw new WhatsAppDeliveryError(`Meta error ${metaCode}: ${metaMessage}`);
  }
  return { messageId: String(responsePayload?.messages?.[0]?.id || "").slice(0, 240) };
}

module.exports = {
  sendNewOrderWhatsApp,
  WhatsAppNotConfiguredError,
  WhatsAppDeliveryError,
  _test: { normalizedWhatsAppNumber, formattedRupees, productSummary, templatePayload },
};
