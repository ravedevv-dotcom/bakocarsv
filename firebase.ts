import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Suppress internal WebChannel reconnect noise
setLogLevel('error');

// In browser/iframe environments, force long polling to prevent WebChannel streaming drops
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId || undefined
);

export const auth = getAuth(app);

// Verify connection on boot per Firebase guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore: Operating in offline mode or waiting for connection.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

export default app;
