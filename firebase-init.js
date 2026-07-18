import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit,
  doc, setDoc, getDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyCCGTu2_PN7avy8JX3jVXX0bVpG5n0cI1I",
  authDomain: "nba-simulator-career.firebaseapp.com",
  projectId: "nba-simulator-career",
  storageBucket: "nba-simulator-career.firebasestorage.app",
  messagingSenderId: "70996121652",
  appId: "1:70996121652:web:d81ead0d469500a1ba1261"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.firestoreDB = { db, collection, addDoc, getDocs, query, where, orderBy, limit, doc, setDoc, getDoc, arrayUnion };