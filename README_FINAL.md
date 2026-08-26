# DevMarket — Final MVP

This is the consolidated Gumroad-simple software marketplace build.

## Included
- React + Vite + React Router
- Firebase Auth (Google/GitHub providers)
- Firebase Cloud Messaging + VAPID
- Supabase PostgreSQL + private storage
- Developer product publishing
- Direct private ZIP upload
- ZIP path-traversal / size / file-count / decompression-limit checks
- Scan/quarantine gate before publishing
- Paystack NGN checkout
- 10% marketplace commission configuration through Paystack split/subaccount flow
- Verified server-side Paystack webhook
- Idempotent webhook processing
- License generation and public verification
- Protected 10-minute signed downloads
- Buyer purchase history
- Notification center + persistent history
- FCM push delivery
- Developer dashboard foundation
- Reports/moderation database foundation
- Mobile responsive UI

## Required production setup
1. Create the private Supabase bucket `product-source`.
2. Run `supabase/schema.sql`, then `supabase/final_mvp.sql`.
3. Enable Google/GitHub providers in Firebase Authentication.
4. Add production domain to Firebase Authorized Domains.
5. Add Vercel environment variables from `.env.example`.
6. Create Paystack developer subaccounts and configure split settlement.
7. Set Paystack webhook to `/api/webhooks/paystack`.
8. Create a Firebase service account and put its private credentials ONLY in Vercel server variables.
9. Run `npm install && npm run build`.
10. Test: unpaid download denied, fake frontend payment denied, invalid webhook denied, wrong amount denied, valid webhook unlocks, signed URL expires.

## Important
The repository intentionally does not execute uploaded developer code. ZIPs are untrusted artifacts and remain private.
