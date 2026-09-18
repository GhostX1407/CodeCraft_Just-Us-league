/**
 * Firebase Admin & Firestore Access Initialization
 * 
 * Provides centralized singleton access to Firebase Admin and Firestore.
 * Supports injecting or replacing Firestore instance for isolated testing.
 */

import * as admin from 'firebase-admin';

// Initialize default app if not already present
if (!admin.apps.length) {
  admin.initializeApp();
}

let firestoreInstance: FirebaseFirestore.Firestore = admin.firestore();

/**
 * Returns the active Firestore instance
 */
export function getDb(): FirebaseFirestore.Firestore {
  return firestoreInstance;
}

/**
 * Overrides the active Firestore instance (useful for unit test fixtures)
 */
export function setDb(customDb: FirebaseFirestore.Firestore): void {
  firestoreInstance = customDb;
}

export const db = getDb();
export { admin };
export const Timestamp = admin.firestore.Timestamp;
export const FieldValue = admin.firestore.FieldValue;
