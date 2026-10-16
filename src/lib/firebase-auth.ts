'use client';

import { initializeApp, getApps } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
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

export async function registerWithEmailPasswordIdToken(
  email: string,
  password: string,
  name: string
): Promise<string> {
  const auth = getClientAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está configurado en el cliente.');
  }

  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const displayName = name.trim();
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  return result.user.getIdToken();
}

export async function sendMemberPasswordReset(email: string): Promise<void> {
  const auth = getClientAuth();
  if (!auth) {
    throw new Error('Firebase Auth no está configurado en el cliente.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

export function firebaseAuthErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : raw;

  if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
    return 'Inicio de sesión cancelado.';
  }
  if (code.includes('email-already-in-use')) {
    return 'Ese email ya tiene una cuenta. Ingresá o recuperá la contraseña.';
  }
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Email o contraseña incorrectos.';
  }
  if (code.includes('weak-password')) {
    return 'La contraseña tiene que tener al menos 6 caracteres.';
  }
  if (code.includes('invalid-email')) {
    return 'El email no es válido.';
  }
  if (code.includes('too-many-requests')) {
    return 'Demasiados intentos. Probá de nuevo en unos minutos.';
  }
  if (code.includes('network-request-failed')) {
    return 'No pudimos conectar. Revisá tu conexión e intentá de nuevo.';
  }
  return err instanceof Error ? err.message : 'No se pudo completar la operación.';
}
