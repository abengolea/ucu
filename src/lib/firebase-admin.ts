import 'server-only';

import fs from 'node:fs';
import { applicationDefault, cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';

let adminApp: App | null = null;
let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;
let adminStorageInstance: Storage | null = null;

declare global {
  // Persist across Turbopack/HMR module reloads (Firestore settings() is once-only).
  // eslint-disable-next-line no-var
  var __ucuFirestoreIgnoreUndefined: boolean | undefined;
}

function loadServiceAccount() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

function createAdminApp(): App | null {
  if (getApps().length) {
    return getApp();
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.firebasestorage.app` : undefined);

  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket,
    });
  }

  if (!projectId) {
    return null;
  }

  try {
    return initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
  } catch {
    return null;
  }
}

function getAppOrNull(): App | null {
  if (adminApp) return adminApp;
  adminApp = createAdminApp();
  return adminApp;
}

export function getAdminDb(): Firestore | null {
  if (adminDbInstance) return adminDbInstance;

  const app = getAppOrNull();
  if (!app) return null;

  const db = getFirestore(app);
  // Form builders omit optional fields as `undefined`; Firestore rejects those
  // unless ignoreUndefinedProperties is on (broke POST /api/reclamos in prod).
  // settings() may only run once and before other Firestore calls — HMR can
  // re-enter here with an already-initialized instance.
  if (!globalThis.__ucuFirestoreIgnoreUndefined) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Already initialized in this process.
    }
    globalThis.__ucuFirestoreIgnoreUndefined = true;
  }
  adminDbInstance = db;
  return adminDbInstance;
}

export function getAdminAuth(): Auth | null {
  if (adminAuthInstance) return adminAuthInstance;

  const app = getAppOrNull();
  if (!app) return null;

  adminAuthInstance = getAuth(app);
  return adminAuthInstance;
}

export function getAdminStorage(): Storage | null {
  if (adminStorageInstance) return adminStorageInstance;

  const app = getAppOrNull();
  if (!app) return null;

  adminStorageInstance = getStorage(app);
  return adminStorageInstance;
}
