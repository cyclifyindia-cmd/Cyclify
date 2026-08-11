# Cyclify WhatsApp order notifications

The `notifyAdminNewOrder` Firebase function sends an administrator alert only when the verified Razorpay flow creates a paid order. Notification failure is recorded on the order and never changes the payment or order status.

## Meta template

Create and obtain approval for this Utility template in WhatsApp Manager:

- Name: `cyclify_new_paid_order`
- Language: English (US) / `en_US`
- Body: `New paid order {{1}} received. Amount: {{2}}. Products: {{3}}. Open the Cyclify Admin Panel to view customer and delivery details.`

## Firebase secrets

From `marketplace-backend`, set these values one at a time. Do not paste them into source files or GitHub:

```powershell
npx firebase-tools@latest functions:secrets:set WHATSAPP_ACCESS_TOKEN --project cyclify-b809a
npx firebase-tools@latest functions:secrets:set WHATSAPP_PHONE_NUMBER_ID --project cyclify-b809a
npx firebase-tools@latest functions:secrets:set WHATSAPP_ADMIN_NUMBER --project cyclify-b809a
```

Use a permanent Meta system-user access token, the WhatsApp Phone Number ID shown by Meta, and the receiving administrator number with country code and digits only (for example, `91xxxxxxxxxx`).

Deploy only the new function:

```powershell
npx firebase-tools@latest deploy --only functions:notifyAdminNewOrder --project cyclify-b809a
```

Complete a Razorpay test payment. The order must still appear even if Meta rejects the notification. Check `adminNotifications.whatsapp` on the Firestore order document for `sent` or `failed` status.
