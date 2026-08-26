# DevMarket smoke test

## Core marketplace
1. Open `/explore`.
2. Confirm loading state appears before results.
3. Search/filter and confirm no full-page reload.
4. Open a product.
5. Confirm missing product shows a real Not Found state.
6. Confirm demo opens the configured URL only.

## Auth
1. Sign in.
2. Refresh.
3. Protected dashboard remains authenticated.
4. Sign out.
5. Protected routes redirect to login.

## Product
1. Create product.
2. Upload ZIP.
3. Confirm progress/error state.
4. Confirm validation errors are visible.
5. Publish only after validation/scan succeeds.
6. Confirm product appears in marketplace after publication.

## Payment
1. Create checkout.
2. Confirm frontend cannot mark order paid.
3. Send invalid webhook -> no entitlement.
4. Send duplicate valid webhook -> one order/license only.
5. Send valid webhook -> order paid + license + notification.

## Download
1. Unpaid order -> 403.
2. Paid order for another buyer -> 403.
3. Paid valid order -> short-lived signed URL.
4. Expired URL -> denied.

## Notifications
1. Register FCM token.
2. Notification is persisted.
3. Push arrives when configured.
4. Notification center shows history.
