import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAVy2tmBL5IQEhquUJEM3VYusiuS9AAUkQ",
  authDomain: "bmi-ai-82fd6.firebaseapp.com",
  projectId: "bmi-ai-82fd6",
  storageBucket: "bmi-ai-82fd6.firebasestorage.app",
  messagingSenderId: "248804751344",
  appId: "1:248804751344:web:f608b26f56178f80afcf35"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const appleProvider = new OAuthProvider('apple.com')
