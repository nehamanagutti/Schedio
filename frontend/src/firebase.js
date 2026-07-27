import { getApp, getApps, initializeApp } from 'firebase/app';
import { GithubAuthProvider, GoogleAuthProvider, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'appId'];
if (requiredConfig.some((key) => !firebaseConfig[key])) {
  throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* variables to your environment.');
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
