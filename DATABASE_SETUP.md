# Database setup

Run `supabase/schema.sql` in the Supabase SQL Editor.

The browser should only use the anon key. Payment/webhook/license/download entitlement mutations must use the server-side service-role key.

Required private bucket:
`product-source`

Recommended object layout:
`products/<product_id>/<version>/source.zip`

Do not make the bucket public.

After applying the schema, test:
- published product visibility
- developer product ownership
- buyer order visibility
- license ownership
- notification history
- FCM token ownership
