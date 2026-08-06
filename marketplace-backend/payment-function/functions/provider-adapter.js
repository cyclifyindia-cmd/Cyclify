class ProviderNotConfiguredError extends Error {
  constructor() {
    super("Payment provider adapter is not configured.");
    this.code = "provider/not-configured";
  }
}

async function createProviderSession() {
  // Replace only this adapter after receiving the aggregator's official API contract.
  // Return: { checkoutUrl, providerSessionId, expiresAt? }
  throw new ProviderNotConfiguredError();
}

async function verifyProviderWebhook() {
  // Verify the provider signature against the exact raw request body before parsing it.
  // Return: { verified:true,eventId,paymentId,attemptId,status,amount,currency }.
  throw new ProviderNotConfiguredError();
}

module.exports = { createProviderSession, verifyProviderWebhook, ProviderNotConfiguredError };
