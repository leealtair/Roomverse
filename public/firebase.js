import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getDatabase,
    ref,
    set
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Use getFirestore

// Firebase configuration provided by the user.
// NOTE: In a production app, it is a best practice not to hardcode credentials like this.
// const firebaseConfig = {
//     apiKey: "AIzaSyAIAok-a_oMJwhqogAFxv82NdnVXTTscFE",
//     authDomain: "roomverse-2936d.firebaseapp.com",
//     databaseURL: "https://roomverse-2936d-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "roomverse-2936d",
//     storageBucket: "roomverse-2936d.firebasestorage.app",
//     messagingSenderId: "85850325953",
//     appId: "1:85850325953:web:cb79882dd1d3fe178ea540",
//     measurementId: "G-DP8DSN13J6"
// };

const firebaseConfig = {
  apiKey: "AIzaSyC-gHGhm3zd6OxGI0KAK2TlbCg3DmUoT1U",
  authDomain: "website-1-562eb.firebaseapp.com",
  databaseURL: "https://website-1-562eb-default-rtdb.firebaseio.com",
  projectId: "website-1-562eb",
  storageBucket: "website-1-562eb.firebasestorage.app",
  messagingSenderId: "68344761050",
  appId: "1:68344761050:web:57b7fa2be1a3de4f4573e3",
  measurementId: "G-R3DWB4KWDD"
};

// This variable is now directly used from the provided firebaseConfig
const appId = firebaseConfig.appId;
// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const sdb = getFirestore(app);
export { appId };
