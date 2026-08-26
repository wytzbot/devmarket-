# FCM Web Push Setup

## Client
- `firebase-client.js` initializes Firebase Auth/Analytics/Messaging.
- `fcm.js` requests browser notification permission, gets an FCM token using `VITE_FIREBASE_VAPID_KEY`, and registers it with `/api/notifications/tokens`.
- `public/firebase-messaging-sw.js` handles background notifications.

## Server
Set these Vercel server-only variables:
- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY`

Never expose these as `VITE_` variables.

## Database
Run `supabase_fcm.sql` in Supabase.

## Sending
Use Firebase Admin SDK from a server-only API/background process to send to stored device tokens. Also insert the same event into `notifications` so the in-app notification center remains the source of persistent history.

## Browser requirements
- Production must use HTTPS.
- Enable Cloud Messaging in Firebase.
- Add the production domain to Firebase Authorized Domains.
- The browser must grant notification permission.
