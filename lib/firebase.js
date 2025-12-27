import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD_LRQdmb3Kyo6NVroUMvHGnx-Ciz9OIcU",
  authDomain: "aqarabhour-c8a9f.firebaseapp.com",
  databaseURL: "https://aqarabhour-c8a9f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aqarabhour-c8a9f",
  storageBucket: "aqarabhour-c8a9f.firebasestorage.app",
  messagingSenderId: "709287383516",
  appId: "1:709287383516:web:008ccd7371f88c8c8f3f19",
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export default firebase;
