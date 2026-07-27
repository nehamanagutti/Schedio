const admin = require('firebase-admin');

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    const error = new Error('Firebase Admin is not configured on the server.');
    error.code = 'FIREBASE_NOT_CONFIGURED';
    throw error;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
  return admin;
}

async function verifyFirebaseIdToken(idToken) {
  return getFirebaseAdmin().auth().verifyIdToken(idToken);
}

module.exports = { verifyFirebaseIdToken };
