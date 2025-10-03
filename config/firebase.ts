// Import the functions you need from the SDKs you need
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { enableNetwork, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD2RIaK9dSViKTw2NZkAdnuK_OR2ugTf1g",
  authDomain: "karoki-7f866.firebaseapp.com",
  projectId: "karoki-7f866",
  storageBucket: "karoki-7f866.firebasestorage.app",
  messagingSenderId: "267694471343",
  appId: "1:267694471343:web:cb19d8d54e48c9d9453c5a",
  measurementId: "G-8QKZZCBK5H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore, Storage, and Auth
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Add connection retry logic
let connectionRetries = 0;
const maxRetries = 3;

const initializeFirestore = async () => {
  try {
    await enableNetwork(db);
    connectionRetries = 0;
  } catch (error) {
    console.error('Firestore connection failed:', error);
    if (connectionRetries < maxRetries) {
      connectionRetries++;
      setTimeout(initializeFirestore, 2000 * connectionRetries);
    } else {
      console.error('Max Firestore connection retries reached');
    }
  }
};

// Initialize connection
initializeFirestore();

// Initialize Analytics only in browser environment
let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics, app, auth, db, storage };

