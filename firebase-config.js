import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  Timestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

/**
 * Cấu hình Firebase cho dự án Kaizen.
 * Thay bằng project Firebase riêng (không dùng chung ATVSV).
 * apiKey trên client là bình thường với SPA; bảo vệ bằng Security Rules + App Check.
 */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/** Để trống = App Check chưa bật (dev). Production: điền reCAPTCHA v3 site key. */
const APP_CHECK_RECAPTCHA_SITE_KEY = "";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const storage = getStorage(app);
const functions = getFunctions(app, "asia-southeast1");

const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Không thể thiết lập Firebase auth persistence:", error);
});

let appCheckInitPromise = null;

export function initAppCheck() {
  if (appCheckInitPromise) return appCheckInitPromise;

  appCheckInitPromise = (async () => {
    const isLocalhost =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";

    if (isLocalhost) {
      // eslint-disable-next-line no-undef
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    if (!APP_CHECK_RECAPTCHA_SITE_KEY) {
      if (!isLocalhost) {
        console.warn(
          "App Check: chưa cấu hình APP_CHECK_RECAPTCHA_SITE_KEY trong firebase-config.js"
        );
      }
      return;
    }

    try {
      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(APP_CHECK_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      await getToken(appCheck, false);
    } catch (error) {
      console.warn("Không thể khởi tạo App Check:", error);
    }
  })();

  return appCheckInitPromise;
}

export {
  app,
  auth,
  db,
  storage,
  functions,
  authPersistenceReady,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  Timestamp,
  increment,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  httpsCallable
};
