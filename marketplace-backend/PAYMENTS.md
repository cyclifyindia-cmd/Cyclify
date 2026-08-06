# Cyclify payment foundation

The provider-neutral payment foundation is implemented under `payment-function/`. It is intentionally disabled on the public website until an aggregator adapter and secrets are configured.

## Security model

1. The browser authenticates with Firebase and sends an idempotency key.
2. `createPaymentSession` ignores browser prices, rebuilds the order from the generated server catalogue, validates availability/options/quantities, and stores a server-owned payment attempt.
3. The provider adapter creates the hosted checkout session in INR.
4. `paymentWebhook` passes the exact raw request body to the provider adapter for signature verification.
5. Only an adapter result marked `verified: true` can enter the Firestore transaction.
6. The transaction checks event uniqueness, payment amount, currency and attempt ownership before creating one customer order.
7. Repeated webhook delivery returns success without creating another order.
8. Browser clients cannot create orders, payment attempts or payment events under `firestore.rules`.

## Catalogue

Run `npm run build:payment-catalog` after every product/price/stock sync and before deploying payment functions. The generated `functions/catalog.json` is the payment source of truth bundled with the backend release.

## Provider hand-off

After receiving the aggregator's official documentation:

1. Implement `createProviderSession` and `verifyProviderWebhook` in `functions/provider-adapter.js`.
2. Store API keys and webhook secrets with Firebase Secret Manager; never commit them.
3. Install dependencies and deploy from `marketplace-backend/payment-function` using the Firebase CLI.
4. Copy the deployed Mumbai `createPaymentSession` HTTPS URL into `assets/js/payment-config.js`.
5. Set the provider name and change `enabled` to `true` only after test-mode verification.
6. Register the deployed `paymentWebhook` URL in the provider dashboard.
7. Publish `marketplace-backend/firestore.rules` before accepting payments.

Cloud Functions requires the Firebase project to use the Blaze plan. The functions are configured for Node.js 22 and `asia-south1` (Mumbai).

## Required acceptance tests

- Successful payment creates exactly one paid order.
- Duplicate create-session calls return the same provider session.
- Duplicate/out-of-order webhooks never create duplicate orders.
- Tampered price, quantity, option, amount or currency is rejected.
- Out-of-stock products/options are rejected before payment.
- Cancelled/failed payments preserve the cart and create no order.
- A success redirect without a verified webhook stays in verification state.
- Refund and partial/full refund events update the payment attempt without deleting accounting history.
- Provider timeout and network retry show a safe customer message.
- Admin can fulfil the order; customer can see status and tracking.
