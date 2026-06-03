import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, onSnapshot, query, where, orderBy, limit, setDoc, addDoc, updateDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Support both environment variables (vibe of production deploys) and static JSON local config
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || (firebaseConfigJson as any).apiKey || '',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || (firebaseConfigJson as any).authDomain || '',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || (firebaseConfigJson as any).projectId || '',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || (firebaseConfigJson as any).storageBucket || '',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfigJson as any).messagingSenderId || '',
  appId: metaEnv.VITE_FIREBASE_APP_ID || (firebaseConfigJson as any).appId || '',
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || (firebaseConfigJson as any).measurementId || '',
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (firebaseConfigJson as any).firestoreDatabaseId || 'default'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Error Handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export type { FirebaseUser };
