# Payment provider integration contract

The checkout is provider-neutral and disabled until a secure server endpoint is deployed.

## Required server endpoint

Implement `POST /api/payments/create-session`. Require a Firebase ID token in the
`Authorization: Bearer <token>` header. The JSON request contains `items`, `address`,
`billingAddress`, and optional GST details.

The server must verify the token, derive the customer UID, look up all products and prices
server-side, create the provider checkout in INR, and store a pending payment with an
idempotency key. Return `{ "checkoutUrl": "https://provider.example/..." }`.

## Required webhook

Verify the provider signature against the raw request body. Only a verified webhook may
mark a payment paid and create the customer order. Make processing idempotent using the
provider event/payment ID. Never store card data.

After deploying both endpoints, set `enabled: true`, the provider label, and the deployed
HTTPS `createSessionUrl` in `assets/js/payment-config.js`.
