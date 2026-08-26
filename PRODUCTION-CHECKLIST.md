# Production checklist

- Configure Firebase Auth providers and authorized domains.
- Configure Firebase Cloud Messaging Web Push and VAPID key.
- Configure Firebase Admin credentials server-side only.
- Configure Supabase URL/service role server-side and private product bucket.
- Configure Paystack secret/webhook endpoint and developer subaccounts where applicable.
- Set all `.env.example` variables in Vercel.
- Never put service-role, Firebase Admin, Paystack secret, or webhook secrets in `VITE_*`.
- Configure Vercel rewrites for SPA fallback if needed.
- Run `npm run build`.
- Test the full smoke-test flow in `SMOKE_TEST.md`.
