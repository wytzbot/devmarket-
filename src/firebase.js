import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getMessaging, isSupported as messagingSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCaDAiGOH5hnpp6NTsGiQynYd-oD8WbWm4",
  authDomain: "devmarket-1c9b6.firebaseapp.com",
  projectId: "devmarket-1c9b6",
  storageBucket: "devmarket-1c9b6.firebasestorage.app",
  messagingSenderId: "136431407731",
  appId: "1:136431407731:web:791e6746491544c0085006",
  measurementId: "G-CYH76RRFHP"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export async function getMessagingIfSupported() {
  if (!(await messagingSupported())) return null;
  return getMessaging(app);
}

export async function getAnalyticsIfSupported() {
  if (!(await isSupported())) return null;
  return getAnalytics(app);
}
