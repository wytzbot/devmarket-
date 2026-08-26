importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");
firebase.initializeApp({
  apiKey:"AIzaSyCaDAiGOH5hnpp6NTsGiQynYd-oD8WbWm4",
  authDomain:"devmarket-1c9b6.firebaseapp.com",
  projectId:"devmarket-1c9b6",
  storageBucket:"devmarket-1c9b6.firebasestorage.app",
  messagingSenderId:"136431407731",
  appId:"1:136431407731:web:791e6746491544c0085006"
});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{
  self.registration.showNotification(payload.notification?.title||"DevMarket",{
    body:payload.notification?.body||"You have a new notification.",
    icon:"/favicon.ico",
    data:payload.data||{}
  });
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification?.data?.url||"/notifications"));
});
