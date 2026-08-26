# Fixes applied

This project had two layers of problems: a frontend crash, and a backend
built against a database schema that didn't match the actual SQL. Both are
fixed below.

## Frontend (would not run at all)
- `src/main.jsx` referenced an undefined `demoProducts` variable on every
  page (Home, Explore, Product, Developer) — a `ReferenceError` on first
  render. Replaced with real data loaded from `/api/marketplace/*` (which
  existed but was never wired into the UI), falling back to demo products
  when the backend isn't configured or has no published products yet.
- `Developer` component had invalid JSX (a missing `/>`) that would fail to
  compile.
- `ErrorBoundary.jsx` existed but was never imported/used anywhere, so a
  runtime error would still show a blank white screen. Now wraps `<App/>`.
- Removed stray, unreferenced duplicate files at the repo root (`fcm.js`,
  `firebase-client.js`) left over from a previous merge — superseded by
  `src/fcm.js` / `src/firebase.js`.

## Backend: two incompatible database schemas
The actual database (`supabase/schema.sql`) has one user table: `profiles`
(keyed by `firebase_uid`). But roughly half the API endpoints — product
creation/publish, payments, purchases, uploads, downloads, notifications —
queried tables called `users` and `developer_profiles`, which don't exist
anywhere in the SQL. Those endpoints would fail on every call. Rewrote the
shared lib (`api/_lib/server.js`) and every endpoint that used it to
consistently use `profiles`.

- `supabase/final_mvp.sql` foreign-keyed `notification_tokens`,
  `notifications`, and `reports` to `public.users` — a table that is never
  created, so the migration itself could not run. Fixed to reference
  `profiles`, and removed its duplicate re-creation of `notifications`
  (already defined correctly in `schema.sql`).
- Deleted `supabase_fcm.sql`, an orphaned third definition of
  `notifications`/`notification_tokens` (using untyped `text` user IDs, no
  foreign keys) that conflicted with the other two and wasn't referenced by
  the setup docs.
- Removed `fcm_tokens` (schema.sql) — defined but never written to or read
  by any code. `notification_tokens` is the table actually in use.
- Push notification tokens were saved keyed by the raw Firebase UID but
  looked up (in `send.js` and the Paystack webhook) by internal profile ID —
  they could never match, so push delivery was silently dead. Fixed to key
  consistently by profile ID.
- `api/uploads/*` and `api/downloads/order.js` referenced a
  `product_versions` table and columns (`version_id`, `file_path`,
  `scan_report`, `scanned_at`) that don't exist on `product_files`. Rewrote
  against the real `product_files` columns, adding the few genuinely useful
  ones (`scan_report`, `scanned_at`, `changelog`) to `schema.sql`.
- Added `profiles.paystack_subaccount`, required by the payments flow but
  missing from the schema.
- `api/payments/paystack.js` inserted `orders.provider` — the column is
  actually named `payment_provider`.

## Dead / duplicate code removed
- `api/uploads/index.js` — always returned `501`, unused (the frontend
  calls `source-url` + `finalize` directly).
- `api/webhooks/[provider].js` — an unfinished, unauthenticated stub
  (accepted any payload with no signature check) that was also unreachable
  in practice since Vercel routes `/api/webhooks/paystack` to the literal
  `paystack.js` file first. Removed as dead attack surface.
- `api/downloads/[orderId].js` — near-duplicate of `downloads/order.js`
  (which the frontend actually calls), also referencing the nonexistent
  `product_versions` table.
- `api/purchases/list.js` — duplicate of `api/purchases/index.js` (the one
  actually called by the frontend), on the old broken schema.
- `api/scans/source.js` — a genuinely more thorough malware scanner
  (executable detection, suspicious-pattern regex, optional ClamAV hook)
  that was never called by anything. Its logic is now merged into
  `api/uploads/finalize.js`, which previously only did a weak inline check.
- `api/lib/auth.js` — redundant/inconsistent with `api/_lib/server.js`;
  consolidated into one shared lib.

## Not fixed (needs a product decision, not a bug fix)
- `profiles` RLS policies use `auth.uid()` (Supabase's own auth), but the
  app authenticates with Firebase and writes via the service-role key
  server-side, so those specific policies never apply. Harmless today since
  all writes go through the service role, but worth knowing if you ever let
  the browser talk to Supabase directly with the anon key.
- The Dashboard's Sales/Analytics/Licenses links point at pages that all
  render the same generic `Dashboard` placeholder — `api/sales/list.js` is
  now correct and ready to use, just not yet wired into its own page.
