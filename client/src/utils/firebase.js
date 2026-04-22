
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "examai-43760.firebaseapp.com",
  projectId: "examai-43760",
  storageBucket: "examai-43760.firebasestorage.app",
  messagingSenderId: "351617373111",
  appId: "1:351617373111:web:b5df458d1838e6f3c98e32"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app)

const provider = new GoogleAuthProvider()

export {auth , provider}