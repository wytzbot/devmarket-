# Database integration notes

The supplied project now contains a normalized Supabase schema and RLS foundation.

The production browser flow should query:
- `products` for Explore and product pages
- `profiles` for developer pages
- `orders` for Purchases/Sales
- `licenses` for license pages
- `notifications` for the notification center
- `fcm_tokens` for push registration

Server-only:
- order creation after verified checkout initiation
- payment webhook updates
- license creation
- signed download authorization
- webhook_events idempotency

Never let the browser set `orders.status = 'paid'`.
