# Cyclify Razorpay checkout

Cyclify uses Razorpay Standard Checkout on the static storefront and Firebase HTTPS Functions in Mumbai for all trusted payment operations. The API secret and webhook secret never enter browser code.

## Payment flow

1. The signed-in browser calls `createRazorpayOrder` with a stable idempotency key, product IDs, quantities and delivery details.
2. The function ignores browser prices, rebuilds the total from `functions/catalog.json`, checks current stock/options, and stores a server-owned Firestore payment attempt.
3. The function creates or safely recovers one Razorpay order and returns only its public checkout fields.
4. Razorpay Standard Checkout collects the payment details.
5. The browser sends the returned payment ID, order ID and signature to `verifyRazorpayPayment`.
6. The function verifies the HMAC with the server secret, fetches the payment directly from Razorpay, and checks that it is captured and matches the server amount, currency and order ID.
7. A Firestore transaction creates exactly one customer order. Signed webhooks provide recovery for delayed capture, failures and refunds.

## Secrets and deployment

Firebase Functions requires the Blaze plan. From `marketplace-backend`, select the `cyclify-b809a` project and add all three secrets:

```powershell
firebase use cyclify-b809a
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

Use a separate, strong value for `RAZORPAY_WEBHOOK_SECRET`; do not reuse the Razorpay API key secret. Keep the same webhook value in Firebase Secret Manager and the Razorpay Dashboard.

Rebuild the trusted product catalogue from the repository root, then deploy the rules and the three functions:

```powershell
npm run build:payment-catalog
cd marketplace-backend
firebase deploy --only firestore:rules,functions:createRazorpayOrder,functions:verifyRazorpayPayment,functions:paymentWebhook
```

Deploy the backend before publishing the enabled `assets/js/payment-config.js` frontend. The public endpoints are already configured for the Mumbai region (`asia-south1`).

## Razorpay Dashboard test-mode setup

- Enable automatic capture so successful payments reach `captured` status.
- Add webhook URL: `https://asia-south1-cyclify-b809a.cloudfunctions.net/paymentWebhook`
- Subscribe to `payment.captured`, `payment.failed`, `refund.created`, and `refund.processed`.
- Enter the same separate webhook secret that was saved as `RAZORPAY_WEBHOOK_SECRET`.
- Complete a test payment, failed payment, modal cancellation, retry, duplicate callback, full refund and partial refund before using live keys.

## Local development

`.env` is ignored by Git and contains local test credentials. `.env.example` contains placeholders only. For Firebase emulator secret overrides, create an ignored `.secret.local` with the same three variable names.

Run the backend checks from `marketplace-backend/payment-function/functions`:

```powershell
npm run check
```

## Security guarantees

- The browser never supplies the trusted price and never receives `RAZORPAY_KEY_SECRET`.
- A signature mismatch cannot mark an attempt as paid.
- A payment must match the stored Razorpay order, amount and currency and be captured.
- Browser clients cannot write payment attempts, events or orders under `firestore.rules`.
- Stable receipts, attempt IDs, event IDs and Firestore transactions prevent duplicate orders.
- The cart clears only after Firestore reports a verified paid attempt.
- Cancellation, failure or uncertain verification preserves the cart and tells the customer not to pay again until status is checked.

## Going live

Rotate any test secret that was shared outside the Razorpay/Firebase secret stores. Generate live Razorpay keys, replace only the Firebase Secret Manager values, configure and test the live-mode webhook separately, then run a small real payment and refund. No source-code secret changes are required.
