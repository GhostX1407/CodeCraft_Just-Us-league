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
firestoreInstance.settings({ ignoreUndefinedProperties: true });

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

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export const db = getDb();
export const getFirestore = getDb;
export { admin, Timestamp, FieldValue };
