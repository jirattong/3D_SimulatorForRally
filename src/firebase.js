import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAkTYlKvAw9-_yvWWTh75_1WbslgkR2Lcg",
  authDomain: "rally-tester-01.firebaseapp.com",
  databaseURL: "https://rally-tester-01-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rally-tester-01",
  storageBucket: "rally-tester-01.firebasestorage.app",
  messagingSenderId: "410986217788",
  appId: "1:410986217788:android:429c6cda36c4b65d119e39"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);