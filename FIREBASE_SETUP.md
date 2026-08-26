# Firebase setup

Configured:
- Firebase project: devmarket-1c9b6
- Firebase Authentication client
- GoogleAuthProvider
- Firebase Analytics
- Firebase Cloud Messaging
- VAPID public key in `.env.example`
- FCM service worker when `public/` exists

Enable Google sign-in in Firebase Console > Authentication > Sign-in method.
For FCM web push, configure the authorized domains and ensure the site is served over HTTPS in production.
Never put Firebase Admin SDK credentials/service-account private keys in the frontend.
