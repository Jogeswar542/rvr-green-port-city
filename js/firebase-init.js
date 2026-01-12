// Firebase Modular SDK with Offline Firestore
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence, addDoc, collection, serverTimestamp, onSnapshotsInSync } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your web app's Firebase configuration (provided)
const firebaseConfig = {
  apiKey: "AIzaSyBEwVpoK8P5WrrJwucvCRcf-MvYQTSS6SQ",
  authDomain: "rvr-green-port-city.firebaseapp.com",
  projectId: "rvr-green-port-city",
  storageBucket: "rvr-green-port-city.firebasestorage.app",
  messagingSenderId: "683382674368",
  appId: "1:683382674368:web:a820ff8240cbd6061fae25",
  measurementId: "G-LP0K2ZE6Z8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Lazy auth: call ensureAuth() only after login success or in guarded admin flows
let authReady = false;
export async function ensureAuth() {
  if (authReady && auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    authReady = true;
    console.log('✅ Anonymous auth active');
    return cred.user;
  } catch (err) {
    console.warn('⚠️ Anonymous auth failed:', err);
    throw err;
  }
}

// Enable offline persistence
try {
  await enableIndexedDbPersistence(db);
  console.log('✅ Firestore offline persistence enabled');
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.warn('⚠️ Multiple tabs open: persistence only in one tab');
  } else if (err.code === 'unimplemented') {
    console.warn('⚠️ Browser does not support offline persistence');
  } else {
    console.warn('⚠️ Persistence error:', err);
  }
}

// Sync indicator handling
let syncStatus = navigator.onLine ? 'synced' : 'offline';
let plotsSyncStatus = 'offline';

onSnapshotsInSync(db, () => {
  syncStatus = navigator.onLine ? 'synced' : 'offline';
  updateSyncIndicator();
  updatePlotsSyncIndicator();
});

function updateSyncIndicator() {
  const el = document.getElementById('syncIndicator');
  if (!el) return;
  el.style.display = 'block';
  if (syncStatus === 'synced') {
    el.textContent = '🟢 Synced';
    el.style.background = '#10b981';
    setTimeout(() => { el.style.display = 'none'; }, 2500);
  } else {
    el.textContent = '🔴 Offline - Will sync later';
    el.style.background = '#ef4444';
  }
}

export function updatePlotsSyncIndicator() {
  const el = document.getElementById('plotsSyncIndicator');
  if (!el) return;
  el.style.display = 'block';
  if (plotsSyncStatus === 'synced') {
    el.textContent = '🟢 Plots Synced';
    el.style.background = '#10b981';
    setTimeout(() => { el.style.display = 'none'; }, 2500);
  } else if (plotsSyncStatus === 'offline') {
    el.textContent = '📦 Plots Offline Cache';
    el.style.background = '#6366f1';
  } else {
    el.textContent = '🟡 Syncing Plots...';
    el.style.background = '#f59e0b';
  }
}

export function setPlotsSyncStatus(status) {
  plotsSyncStatus = status;
  updatePlotsSyncIndicator();
}

window.addEventListener('online', () => { 
  syncStatus = 'synced'; 
  updateSyncIndicator();
  if (window.onOnlineRestore) window.onOnlineRestore();
});

// ===== GOOGLE SIGN-IN WITH ROLE-BASED EMAIL WHITELIST =====

// Configure authorized emails for each role
const AUTHORIZED_USERS = {
  admin: [
    'admin@rvrgreenporcity.com',
    'rvradmin@gmail.com',
    // User-provided emails
    'suntraderskvl@gmail.com',
    'jogebablu9700@gmail.com',
    'kalyanraju532@gmail.com',
    'rvrconsultancy2003@gmail.com',
  ],
  agent: [
    'agent@rvrgreenporcity.com',
    'rvragent@gmail.com',
    // User-provided emails
    'suntraderskvl@gmail.com',
    'jogebablu9700@gmail.com',
    'kalyanraju532@gmail.com',
    'rvrconsultancy2003@gmail.com',
  ]
};

// Google Sign-In function
export async function signInWithGoogle(requestedRole) {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const email = user.email.toLowerCase();
    
    console.log('✅ Google Sign-In successful:', email);
    
    // Check if email is authorized for the requested role
    const roleEmails = AUTHORIZED_USERS[requestedRole] || [];
    const normalizedEmails = roleEmails.map(e => e.toLowerCase());
    
    if (!normalizedEmails.includes(email)) {
      // Check if user is authorized for a different role
      let actualRole = null;
      for (const [role, emails] of Object.entries(AUTHORIZED_USERS)) {
        if (emails.map(e => e.toLowerCase()).includes(email)) {
          actualRole = role;
          break;
        }
      }
      
      if (actualRole) {
        throw new Error(`This email is authorized as ${actualRole.toUpperCase()}, not ${requestedRole.toUpperCase()}`);
      } else {
        throw new Error('This email is not authorized. Please contact administrator.');
      }
    }
    
    // Store login session
    const session = {
      email: email,
      role: requestedRole,
      name: user.displayName || email.split('@')[0],
      photoURL: user.photoURL,
      loginTime: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    localStorage.setItem('userSession', JSON.stringify(session));
    localStorage.setItem('userRole', requestedRole);
    
    return { success: true, role: requestedRole, user: session };
    
  } catch (error) {
    console.error('❌ Google Sign-In failed:', error);
    
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup blocked. Please allow popups and try again.');
    } else if (error.message.includes('not authorized')) {
      throw error;
    } else {
      throw new Error('Sign-in failed: ' + error.message);
    }
  }
}

// Check if user is authorized (for any role)
export function isEmailAuthorized(email) {
  const normalizedEmail = email.toLowerCase();
  for (const emails of Object.values(AUTHORIZED_USERS)) {
    if (emails.map(e => e.toLowerCase()).includes(normalizedEmail)) {
      return true;
    }
  }
  return false;
}

// Get user's authorized role
export function getEmailRole(email) {
  const normalizedEmail = email.toLowerCase();
  for (const [role, emails] of Object.entries(AUTHORIZED_USERS)) {
    if (emails.map(e => e.toLowerCase()).includes(normalizedEmail)) {
      return role;
    }
  }
  return null;
}

// ===== PASSCODE FALLBACK (ROUGH ACCESS) =====
// Note: Passcodes in frontend are not secure; use only as temporary fallback.
export const PASSCODES = {
  admin: 'admin123', // change as needed
  agent: 'agent123'  // change as needed (not shown in UI by default)
};

export async function signInWithPasscode(requestedRole, passcode) {
  const expected = PASSCODES[requestedRole];
  if (!expected) throw new Error('Unknown role');
  if (passcode !== expected) throw new Error('Invalid passcode');

  // Create a local session similar to Google Sign-In
  const session = {
    email: `${requestedRole}@passcode.local`,
    role: requestedRole,
    name: `${requestedRole.toUpperCase()} User`,
    photoURL: null,
    loginTime: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
  };

  localStorage.setItem('userSession', JSON.stringify(session));
  localStorage.setItem('userRole', requestedRole);
  return { success: true, role: requestedRole, user: session };
}

// ===== AGENT USERNAME/PASSWORD (ROUGH ACCESS) =====
// WARNING: Front-end stored credentials are not secure; use for temporary/testing only.
export const AGENT_ACCOUNTS = {
  // id: { password, name }
  'agent001': { password: 'Rvr@Agent2026', name: 'Default Agent' },
  // Custom agent IDs
  'kalyan': { password: 'Kalyan@532', name: 'Kalyan Raju' },
  'joge': { password: 'Joge@9700', name: 'Jogebabu' },
  'suntraders': { password: 'Sun@2026', name: 'Sun Traders KVL' },
  'rvrconsult': { password: 'Rvr@2003', name: 'RVR Consultancy' },
  // add more agents here, e.g.
  // 'kalyan': { password: 'Kalyan@532', name: 'Kalyan Raju' },
};

export async function signInAgentWithCredentials(agentId, password) {
  const rec = AGENT_ACCOUNTS[agentId];
  if (!rec) throw new Error('Unknown Agent ID');
  if (rec.password !== password) throw new Error('Incorrect password');

  // Sign in to Firebase Auth anonymously for Firestore permissions
  await ensureAuth();

  const session = {
    email: `${agentId}@agent.local`,
    role: 'agent',
    name: rec.name || agentId,
    photoURL: null,
    loginTime: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
  };

  localStorage.setItem('userSession', JSON.stringify(session));
  localStorage.setItem('userRole', 'agent');
  return { success: true, role: 'agent', user: session };
}

// ===== ADMIN USERNAME/PASSWORD (ROUGH ACCESS) =====
export const ADMIN_ACCOUNTS = {
  // id: { password, name }
  'admin001': { password: 'Rvr@Admin2026', name: 'Default Admin' },
  'rvradmin': { password: 'Rvr@Admin2026', name: 'RVR Admin' },
  // add more admins here
  // 'superadmin': { password: 'Super@123', name: 'Super Admin' },
};

export async function signInAdminWithCredentials(adminId, password) {
  const rec = ADMIN_ACCOUNTS[adminId];
  if (!rec) throw new Error('Unknown Admin ID');
  if (rec.password !== password) throw new Error('Incorrect password');

  // Sign in to Firebase Auth anonymously for Firestore permissions
  await ensureAuth();

  const session = {
    email: `${adminId}@admin.local`,
    role: 'admin',
    name: rec.name || adminId,
    photoURL: null,
    loginTime: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
  };

  localStorage.setItem('userSession', JSON.stringify(session));
  localStorage.setItem('userRole', 'admin');
  return { success: true, role: 'admin', user: session };
}

window.addEventListener('offline', () => { 
  syncStatus = 'offline'; 
  plotsSyncStatus = 'offline';
  updateSyncIndicator();
  updatePlotsSyncIndicator();
});

// ===== OFFLINE SYNC FOR ENQUIRIES =====
// When browser comes online, push any offline-stored enquiries to Firebase
window.onOnlineRestore = async () => {
  if (!window.getOfflineEnquiries || !window.markEnquirySynced) {
    console.warn('⚠️ Local storage module not loaded yet');
    return;
  }

  try {
    const offlineEnquiries = await getOfflineEnquiries();
    if (offlineEnquiries.length === 0) {
      console.log('✅ No offline enquiries to sync');
      return;
    }

    console.log(`🔄 Syncing ${offlineEnquiries.length} offline enquiries...`);
    let synced = 0;

    for (const enquiry of offlineEnquiries) {
      try {
        const docRef = await addDoc(collection(db, 'enquiries'), {
          ...enquiry,
          synced: true,
          syncedAt: serverTimestamp(),
        });
        await markEnquirySynced(enquiry.id || enquiry.timestamp);
        synced++;
      } catch (err) {
        console.warn(`⚠️ Failed to sync enquiry:`, err);
      }
    }

    console.log(`✅ Synced ${synced}/${offlineEnquiries.length} enquiries`);
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
      indicator.textContent = `✓ Synced ${synced} enquiries`;
      indicator.style.background = '#10b981';
      indicator.style.display = 'block';
      setTimeout(() => { indicator.style.display = 'none'; }, 3000);
    }
  } catch (err) {
    console.error('❌ Error during offline sync:', err);
  }
};

// Submit enquiry with offline support
window.submitEnquiryOffline = async (event) => {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : 'Send Enquiry Now';

  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const payload = {
    ...data,
    status: 'new',
    submittedAt: new Date().toISOString(),
    timestamp: serverTimestamp(),
    offline: !navigator.onLine,
  };

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = navigator.onLine ? 'Submitting…' : 'Saving offline…';
    }

    const ref = await addDoc(collection(db, 'enquiries'), payload);
    console.log('✅ Enquiry saved:', ref.id);

    alert(navigator.onLine
      ? 'Thank you! Your enquiry has been submitted. Our team will contact you within 30 minutes.'
      : 'Saved offline! It will sync automatically when you are online.');

    form.reset();
  } catch (err) {
    console.error('❌ Error saving enquiry:', err);
    alert('Error submitting enquiry. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
};
