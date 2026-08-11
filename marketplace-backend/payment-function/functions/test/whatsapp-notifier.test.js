const assert = require("node:assert/strict");
const test = require("node:test");

process.env.WHATSAPP_ACCESS_TOKEN = "unit-test-token";
process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789012345";
process.env.WHATSAPP_ADMIN_NUMBER = "+91 98765 43210";

const notifier = require("../whatsapp-notifier");

test("normalizes the administrator number and requires a country code-ready number", () => {
  assert.equal(notifier._test.normalizedWhatsAppNumber("+91 98765 43210"), "919876543210");
  assert.throws(() => notifier._test.normalizedWhatsAppNumber("123"), /country code/);
});

test("builds the approved Cyclify order template without customer personal details", () => {
  const payload = notifier._test.templatePayload({
    number: "CY260811ABC123",
    total: 35000,
    items: [{ name: "ThinkRider X2 Max", quantity: 1 }],
    address: { phone: "should-not-be-sent", address: "should-not-be-sent" },
  });
  assert.equal(payload.to, "919876543210");
  assert.equal(payload.template.name, "cyclify_new_paid_order");
  assert.deepEqual(payload.template.components[0].parameters.map(parameter => parameter.text), [
    "CY260811ABC123",
    "₹35,000",
    "ThinkRider X2 Max × 1",
  ]);
  assert.doesNotMatch(JSON.stringify(payload), /should-not-be-sent/);
});

test("sends the Meta request without exposing the token in its body", async () => {
  let request;
  const result = await notifier.sendNewOrderWhatsApp({
    number: "CY260811ABC123",
    total: 2500,
    items: [{ name: "FLR PR-350 Pedals", quantity: 1 }],
  }, async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid.test" }] }) };
  });
  assert.match(request.url, /graph\.facebook\.com\/v23\.0\/123456789012345\/messages$/);
  assert.equal(request.options.headers.Authorization, "Bearer unit-test-token");
  assert.doesNotMatch(request.options.body, /unit-test-token/);
  assert.equal(result.messageId, "wamid.test");
});
