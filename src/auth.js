// ==========================================================================
// Firebase Authentication & Role Management Module
// ==========================================================================

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isCloudFirebaseActive } from './firebase-config.js';

let currentUser = null;
let currentUserRole = null;
let currentUserProfile = null;

const authListeners = [];

// Local fallback user state for demo mode when Firebase config is offline
const LOCAL_AUTH_KEY = 'pulsebed_demo_user';
const LOCAL_ROLE_KEY = 'pulsebed_demo_role';
const LOCAL_PROFILE_KEY = 'pulsebed_demo_profile';

function getLocalDemoUser() {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getLocalDemoRole() {
  return localStorage.getItem(LOCAL_ROLE_KEY) || null;
}

function getLocalDemoProfile() {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setLocalDemoUser(user, role, profile) {
  if (user) {
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
    localStorage.setItem(LOCAL_ROLE_KEY, role);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(LOCAL_AUTH_KEY);
    localStorage.removeItem(LOCAL_ROLE_KEY);
    localStorage.removeItem(LOCAL_PROFILE_KEY);
  }
}

// Initialize Auth Listener
export function initAuth(onStateChangeCallback) {
  if (onStateChangeCallback) {
    authListeners.push(onStateChangeCallback);
  }

  if (isCloudFirebaseActive && auth && db) {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            currentUserProfile = docSnap.data();
            currentUserRole = currentUserProfile.role || 'USER';
          } else {
            // Default check for safety
            currentUserRole = (user.email === 'admin@hospital.org') ? 'ADMIN' : 'USER';
            currentUserProfile = {
              uid: user.uid,
              name: user.displayName || (currentUserRole === 'ADMIN' ? 'Hospital Administrator' : 'Patient/User'),
              email: user.email,
              phone: '',
              role: currentUserRole,
              createdAt: new Date().toISOString()
            };
          }
        } catch (err) {
          console.warn("Firestore user role fetch error, defaulting:", err);
          currentUserRole = (user.email === 'admin@hospital.org') ? 'ADMIN' : 'USER';
          currentUserProfile = {
            uid: user.uid,
            name: user.email === 'admin@hospital.org' ? 'Hospital Administrator' : 'Patient/User',
            email: user.email,
            role: currentUserRole
          };
        }
      } else {
        currentUser = null;
        currentUserRole = null;
        currentUserProfile = null;
      }
      notifyAuthListeners(currentUser);
    });
  } else {
    // Check local storage for demo session
    currentUser = getLocalDemoUser();
    currentUserRole = getLocalDemoRole();
    currentUserProfile = getLocalDemoProfile();
    notifyAuthListeners(currentUser);
  }
}

function notifyAuthListeners(user) {
  authListeners.forEach(cb => cb(user));
  updateAuthUI(user);
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentUserRole() {
  return currentUserRole;
}

export function getCurrentUserProfile() {
  return currentUserProfile;
}

export function isAuthenticated() {
  return !!currentUser;
}

// Login Function
export async function loginUser(email, password, expectedRole = null) {
  if (isCloudFirebaseActive && auth && db) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Fetch user role doc
      let role = 'USER';
      let profile = null;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          profile = docSnap.data();
          role = profile.role || 'USER';
        } else {
          role = (user.email === 'admin@hospital.org') ? 'ADMIN' : 'USER';
          profile = { uid: user.uid, email: user.email, role };
        }
      } catch (err) {
        role = (user.email === 'admin@hospital.org') ? 'ADMIN' : 'USER';
        profile = { uid: user.uid, email: user.email, role };
      }

      // Enforce role check if specified (e.g. Admin portal expects ADMIN/STAFF, Patient expects USER)
      if (expectedRole) {
        if (expectedRole === 'ADMIN_STAFF') {
          if (role !== 'ADMIN' && role !== 'STAFF') {
            await signOut(auth);
            return { success: false, message: 'You do not have permission to access the Admin Portal.' };
          }
        } else if (expectedRole === 'USER') {
          if (role !== 'USER') {
            await signOut(auth);
            return { success: false, message: 'You do not have permission to access the Patient Portal.' };
          }
        }
      }

      currentUser = user;
      currentUserRole = role;
      currentUserProfile = profile;
      notifyAuthListeners(currentUser);
      return { success: true, user: currentUser, role: currentUserRole };
    } catch (error) {
      return { success: false, message: error.message };
    }
  } else {
    // Demo Mode Auth Simulation
    if (email && password && password.length >= 6) {
      let role = 'USER';
      let name = 'Demo Patient';
      
      if (email === 'admin@hospital.org') {
        role = 'ADMIN';
        name = 'Hospital Administrator';
      } else if (email === 'staff@hospital.org') {
        role = 'STAFF';
        name = 'Clinical Staff';
      } else if (email === 'patient@example.com') {
        role = 'USER';
        name = 'Demo Patient';
      }

      if (expectedRole) {
        if (expectedRole === 'ADMIN_STAFF') {
          if (role !== 'ADMIN' && role !== 'STAFF') {
            return { success: false, message: 'You do not have permission to access the Admin Portal.' };
          }
        } else if (expectedRole === 'USER') {
          if (role !== 'USER') {
            return { success: false, message: 'You do not have permission to access the Patient Portal.' };
          }
        }
      }

      currentUser = {
        uid: role === 'ADMIN' ? 'demo_admin_123' : (role === 'STAFF' ? 'demo_staff_456' : 'demo_user_789'),
        email: email,
        displayName: name
      };
      currentUserRole = role;
      currentUserProfile = {
        uid: currentUser.uid,
        name: name,
        email: email,
        phone: '+91 9999999999',
        role: role,
        createdAt: new Date().toISOString()
      };
      setLocalDemoUser(currentUser, currentUserRole, currentUserProfile);
      notifyAuthListeners(currentUser);
      return { success: true, user: currentUser, role: currentUserRole };
    } else {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }
  }
}

// User Registration Function
export async function registerUser(name, email, phone, password) {
  if (isCloudFirebaseActive && auth && db) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user profile details in Firestore
      const userDoc = {
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: 'USER', // Default role is always USER
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userDoc);

      currentUser = user;
      currentUserRole = 'USER';
      currentUserProfile = userDoc;
      notifyAuthListeners(currentUser);
      return { success: true, user: currentUser };
    } catch (error) {
      return { success: false, message: error.message };
    }
  } else {
    // Demo Mode Registration
    currentUser = {
      uid: 'demo_user_' + Date.now(),
      email: email,
      displayName: name
    };
    currentUserRole = 'USER';
    currentUserProfile = {
      uid: currentUser.uid,
      name: name,
      email: email,
      phone: phone,
      role: 'USER',
      createdAt: new Date().toISOString()
    };
    setLocalDemoUser(currentUser, currentUserRole, currentUserProfile);
    notifyAuthListeners(currentUser);
    return { success: true, user: currentUser };
  }
}

// Logout Function
export async function logoutUser() {
  if (isCloudFirebaseActive && auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("SignOut error:", e);
    }
  }
  currentUser = null;
  currentUserRole = null;
  currentUserProfile = null;
  setLocalDemoUser(null);
  notifyAuthListeners(null);
  return { success: true };
}

// UI State Updater for Auth
export function updateAuthUI(user) {
  const userProfileEl = document.getElementById('userProfile');
  const guestProfileEl = document.getElementById('guestProfile');
  const userEmailEl = document.getElementById('userEmail');
  const userAvatarEl = document.getElementById('userAvatar');
  const userRoleEl = document.querySelector('.user-role');

  const adminElements = document.querySelectorAll('.admin-item');
  const userElements = document.querySelectorAll('.user-item');

  if (user && currentUserRole) {
    // Authenticated View
    if (userProfileEl) userProfileEl.classList.remove('hidden');
    if (guestProfileEl) guestProfileEl.classList.add('hidden');
    if (userEmailEl) userEmailEl.textContent = user.email || '';
    if (userAvatarEl) userAvatarEl.textContent = (user.email || 'U').charAt(0).toUpperCase();
    if (userRoleEl) {
      userRoleEl.textContent = currentUserRole;
      userRoleEl.className = `user-role ${currentUserRole === 'ADMIN' ? 'badge-admin' : (currentUserRole === 'STAFF' ? 'badge-staff' : 'badge-user')}`;
    }

    if (currentUserRole === 'ADMIN' || currentUserRole === 'STAFF') {
      adminElements.forEach(el => el.classList.remove('hidden'));
      userElements.forEach(el => el.classList.add('hidden'));
    } else {
      adminElements.forEach(el => el.classList.add('hidden'));
      userElements.forEach(el => el.classList.remove('hidden'));
    }
  } else {
    // Public Unauthenticated Visitor View
    if (userProfileEl) userProfileEl.classList.add('hidden');
    if (guestProfileEl) guestProfileEl.classList.remove('hidden');

    // Hide role-specific items
    adminElements.forEach(el => el.classList.add('hidden'));
    userElements.forEach(el => el.classList.add('hidden'));
  }
}
