import { getToken, onMessage } from "firebase/messaging";
import { auth, getMessagingIfSupported } from "./firebase";

export async function enablePushNotifications() {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return { supported: false };
  if (!("Notification" in window)) return { supported: false };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { supported: true, permission };

  if (!navigator.serviceWorker) throw new Error("Service worker is unavailable.");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (token && auth.currentUser) {
    await fetch("/api/notifications/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await auth.currentUser.getIdToken()}`
      },
      body: JSON.stringify({ token, platform: "web" })
    });
  }
  return { supported: true, permission, token };
}

export async function listenToPush(callback) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
