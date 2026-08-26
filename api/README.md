# DevMarket API

The MVP uses Firebase ID tokens for identity, Supabase service-role access only on the server, private source storage, and Paystack NGN split payments.

Key endpoints:
- POST /api/products — create developer draft
- POST /api/uploads/source-url — create private signed upload URL
- POST /api/uploads/finalize — validate ZIP and record scan result
- POST /api/products/publish — publish only after clean scan
- POST /api/payments/paystack — create Paystack NGN transaction with 10% marketplace transaction charge and developer subaccount
- POST /api/webhooks/paystack — verify webhook + transaction and issue license
- GET /api/downloads/:orderId — authorize and issue 10-minute signed source URL

Configure Paystack webhook to /api/webhooks/paystack.
