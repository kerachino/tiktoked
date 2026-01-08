import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCJsNKj6NCSxGC1_pOAeecmWl7W2_svnZM",
  authDomain: "tiktoker-94b35.firebaseapp.com",
  databaseURL: "https://tiktoker-94b35-default-rtdb.firebaseio.com",
  projectId: "tiktoker-94b35",
  storageBucket: "tiktoker-94b35.firebasestorage.app",
  messagingSenderId: "305274463400",
  appId: "1:305274463400:web:47ad7009ad7402e9e04e9d",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
