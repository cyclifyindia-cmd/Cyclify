# Cyclify Used Market Backend Setup

This setup keeps Firebase for accounts and listing data, while Cloudflare R2 stores customer photos and videos.

## 1. Create Firestore

1. Open Firebase Console and select `cyclify-b809a`.
2. Open **Databases and storage**, then **Firestore Database**.
3. Choose **Create database** and select a production location near India.
4. Open the **Rules** tab and paste the contents of `firestore.rules`.
5. Publish the rules.

## 2. Mark the Cyclify administrator

1. In Firebase Authentication, open your own Cyclify account and copy its UID.
2. In Firestore, create a collection named `admins`.
3. Create a document whose document ID is your UID.
4. Add a field named `role` with the value `admin`.

Only this account can approve or reject public listings.

## 3. Create Cloudflare R2

1. Create or sign in to a Cloudflare account.
2. Open **R2 Object Storage** and create a bucket named `cyclify-used-media`.
3. Open **Workers & Pages** and create a Worker named `cyclify-used-media`.
4. Copy `cloudflare-worker/src/index.js` into the Worker editor.
5. In Worker settings, add an R2 binding:
   - Variable name: `CYCLIFY_MEDIA`
   - Bucket: `cyclify-used-media`
6. Add a text variable:
   - Name: `FIREBASE_PROJECT_ID`
   - Value: `cyclify-b809a`
7. Deploy the Worker and copy its `workers.dev` address.

Never place an R2 API token or Firebase admin key in the website.

## 4. Connect the website

Send the Worker address to Codex. Codex will place it in the site configuration and switch Used Market from local browser storage to Firestore and R2.

## Retention policy

- Pending rejected ads: delete media within 2 days.
- Sold ads: remove media after 14 days.
- Other ads: expire after 60 days unless renewed.
- Maximum four compressed images and one compressed video per ad.
