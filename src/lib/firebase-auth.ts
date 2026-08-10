'use client';

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getClientAuth(): Auth | null {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}

export async function signInWithGoogleIdToken(): Promise<string> {
  const auth = getClientAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está configurado en el cliente.');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return idToken;
}

/** Login con email/contraseña de Firebase Auth (p. ej. tras reset). Devuelve idToken. */
export async function signInWithEmailPasswordIdToken(
  email: string,
  password: string
): Promise<string> {
  const auth = getClientAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está configurado en el cliente.');
  }

  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user.getIdToken();
}
