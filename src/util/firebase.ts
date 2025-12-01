import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBPmcioRDL5sQFRCs6n0I5bhAlVtlRKJAc",
  authDomain: "task-30f75.firebaseapp.com",
  projectId: "task-30f75",
  storageBucket: "task-30f75.firebasestorage.app",
  messagingSenderId: "177606710906",
  appId: "1:177606710906:web:01a4679959b81bd5e30dc3",
  measurementId: "G-XKYT8Y900G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const provider = new GoogleAuthProvider();