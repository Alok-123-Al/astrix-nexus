import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBFJvNgWf81AqvmGdYUOIm3VyzD4UW3IYA",
  authDomain: "astrixnexus-official.firebaseapp.com",
  projectId: "astrixnexus-official",
  storageBucket: "astrixnexus-official.firebasestorage.app",
  messagingSenderId: "460666244244",
  appId: "1:460666244244:web:d86b86f72ceda2f36c3881",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
