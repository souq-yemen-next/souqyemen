// lib/firebaseClient.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const env = (k, fallback) => (process.env[k] ? process.env[k] : fallback);

// افتراضياً: نفس إعدادات index.html القديمة (تقدر تغيرها من .env.local)
const firebaseConfig = {
  apiKey: env('NEXT_PUBLIC_FIREBASE_API_KEY', "AIzaSyD_LRQdmb3Kyo6NVroUMvHGnx-Ciz9OIcU"),
  authDomain: env('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', "aqarabhour-c8a9f.firebaseapp.com"),
  databaseURL: env('NEXT_PUBLIC_FIREBASE_DATABASE_URL', "https://aqarabhour-c8a9f-default-rtdb.asia-southeast1.firebasedatabase.app"),
  projectId: env('NEXT_PUBLIC_FIREBASE_PROJECT_ID', "aqarabhour-c8a9f"),
  storageBucket: env('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', "aqarabhour-c8a9f.firebasestorage.app"),
  messagingSenderId: env('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', "709287383516"),
  appId: env('NEXT_PUBLIC_FIREBASE_APP_ID', "1:709287383516:web:008ccd7371f88c8c8f3f19")
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();

export { firebase, auth, db, storage, googleProvider };
export default firebase;
