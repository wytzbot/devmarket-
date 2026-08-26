# Real data wiring

The ZIP now contains server-backed marketplace and account endpoints.

Use:
- `/api/marketplace/products` for Explore
- `/api/marketplace/product?slug=...` for Product pages
- `/api/purchases/list` for buyer Purchases
- `/api/sales/list` for developer Sales
- `src/services/marketplaceApi.js` for browser helpers

Authentication for account endpoints:
`Authorization: Bearer <Firebase ID token>`

The API resolves Firebase users through a `profiles.firebase_uid` field. Add this field to Supabase before using the account endpoints:

```sql
alter table public.profiles add column if not exists firebase_uid text unique;
create index if not exists profiles_firebase_uid_idx on public.profiles(firebase_uid);
```

Do not expose the Supabase service-role key to the browser.

For production, the remaining UI components should consume these endpoints instead of local/demo product arrays.
