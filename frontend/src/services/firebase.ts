import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'demo-raahi-key',
  authDomain: 'rahi-healthtech.firebaseapp.com',
  projectId: 'rahi-healthtech',
  storageBucket: 'rahi-healthtech.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:raahihealthtech',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance: Firestore | null = null;
try {
  firestoreInstance = getFirestore(app);

  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '';

    if (isLocalhost) {
      try {
        connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
      } catch {
        // Already connected or running
      }
    }
  }
} catch (e) {
  console.warn('[Raahi Firebase] Firestore initialization warning:', e);
}

export const firestore = firestoreInstance;
