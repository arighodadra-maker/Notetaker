import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Firebase 12 dropped getReactNativePersistence. Build a minimal AsyncStorage
// persistence so auth survives app restarts on iOS/Android.
const asyncStoragePersistence = {
  type: "LOCAL" as const,
  async _isAvailable() {
    return true;
  },
  async _set(key: string, value: object) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async _get(key: string) {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as object) : null;
  },
  async _remove(key: string) {
    await AsyncStorage.removeItem(key);
  },
  _addListener(_key: string, _listener: unknown) {},
  _removeListener(_key: string, _listener: unknown) {},
};

export const auth = getApps().length > 1
  ? getAuth(app)
  : initializeAuth(app, { persistence: asyncStoragePersistence });

export const db = getFirestore(app);
