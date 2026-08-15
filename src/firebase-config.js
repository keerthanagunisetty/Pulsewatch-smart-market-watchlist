// ==========================================================================
// Firebase SDK Initialization & Reactive Storage Fallback Engine
// ==========================================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Default / Stored Firebase Web App Credentials
const LOCAL_STORAGE_CFG_KEY = 'pulsebed_firebase_config';

function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CFG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not parse stored Firebase config', e);
  }
  return null;
}

export function saveStoredFirebaseConfig(config) {
  localStorage.setItem(LOCAL_STORAGE_CFG_KEY, JSON.stringify(config));
}

// Check if credentials are set
const storedCfg = getStoredFirebaseConfig();

// Default configuration set up from your Firebase console setup
export const firebaseConfig = storedCfg || {
  apiKey: "AIzaSyDcKNEImsvouj03dKqVyAHZ4JTUhYhp4mc",
  authDomain: "pulsebed-tracker.firebaseapp.com",
  projectId: "pulsebed-tracker",
  storageBucket: "pulsebed-tracker.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:demo123456"
};

export let app;
export let auth;
export let db;
export let isCloudFirebaseActive = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Note: if using default config or stored config, mark as active cloud firebase
  if ((storedCfg && storedCfg.apiKey) || (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyDemoKey_PulseBedHospitalTracker")) {
    isCloudFirebaseActive = true;
  }
} catch (error) {
  console.warn("Firebase initialization warning (switching to local storage fallback mode):", error.message);
  isCloudFirebaseActive = false;
}

export function updateStorageModeUI() {
  const dot = document.getElementById('syncStatusDot');
  const txt = document.getElementById('syncStatusText');
  const badge = document.getElementById('storageModeBadge');

  if (isCloudFirebaseActive) {
    if (dot) dot.className = 'status-indicator online';
    if (txt) txt.textContent = 'Firebase Firestore Sync';
    if (badge) badge.textContent = 'Firestore Active';
  } else {
    if (dot) dot.className = 'status-indicator fallback';
    if (txt) txt.textContent = 'Local Reactive Engine';
    if (badge) badge.textContent = 'Demo Mode (Offline)';
  }
}
