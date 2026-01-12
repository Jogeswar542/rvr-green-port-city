import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db, setPlotsSyncStatus, ensureAuth } from "./firebase-init.js";

// --- 1. FIREBASE ---
// Use shared modular initialization and Firestore instance from firebase-init.js

// --- 2. OFFLINE PLOTS CACHE (RUNNING COST - syncs when online) ---
// Using IndexedDB for larger storage capacity
let lastSyncTime = null;

async function cachePlotsOffline(plots) {
  try {
    if (window.cachePlotsLocally) {
      await window.cachePlotsLocally(plots);
      lastSyncTime = new Date();
      updateSyncTimestamp();
      console.log('✅ Plots cached in IndexedDB:', plots.length, 'plots');
    } else {
      // Fallback to localStorage if IndexedDB not ready
      localStorage.setItem('rvr_plots_cache', JSON.stringify(plots));
      localStorage.setItem('rvr_plots_timestamp', new Date().toISOString());
      lastSyncTime = new Date();
      updateSyncTimestamp();
    }
  } catch (e) {
    console.warn('⚠️ Could not cache plots:', e.message);
  }
}

async function getPlotsFromCache() {
  try {
    if (window.getCachedPlots) {
      const cached = await window.getCachedPlots();
      if (cached && cached.length > 0) {
        const timestamp = localStorage.getItem('rvr_plots_timestamp');
        lastSyncTime = timestamp ? new Date(timestamp) : null;
        updateSyncTimestamp();
      }
      return cached;
    } else {
      // Fallback to localStorage
      const cached = localStorage.getItem('rvr_plots_cache');
      if (cached) {
        const timestamp = localStorage.getItem('rvr_plots_timestamp');
        lastSyncTime = timestamp ? new Date(timestamp) : null;
        updateSyncTimestamp();
        return JSON.parse(cached);
      }
      return null;
    }
  } catch (e) {
    console.warn('⚠️ Could not read plots cache:', e.message);
    return null;
  }
}

function updateSyncTimestamp() {
  const indicator = document.getElementById('plotsSyncIndicator');
  if (!indicator || !lastSyncTime) return;
  
  const now = new Date();
  const diffMs = now - lastSyncTime;
  const diffMins = Math.floor(diffMs / 60000);
  
  let timeAgo = '';
  if (diffMins < 1) timeAgo = 'just now';
  else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
  else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins/60)}h ago`;
  else timeAgo = `${Math.floor(diffMins/1440)}d ago`;
  
  const syncText = navigator.onLine ? `🟢 Synced ${timeAgo}` : `📦 Offline (synced ${timeAgo})`;
  indicator.textContent = syncText;
}

// --- 3. REAL-TIME SYNC ENGINE (RUNNING COST - loads cached, syncs when online) ---
export function startRealtimeSync(onDataUpdate) {
  ensureAuth().catch((e)=>console.warn('Auth not ready for sync', e));
  
  // CAPITAL: App shell & images already loaded from service worker
  // RUNNING: Load cached plots for instant display (offline fallback)
  getPlotsFromCache().then(cached => {
    if (cached && cached.length > 0) {
      window.allPlots = cached;
      setPlotsSyncStatus('syncing');
      if (onDataUpdate) onDataUpdate(cached);
      console.log('⚡ Loaded from cache:', cached.length, 'plots (syncing in background)');
    }
  });
  
  const plotsRef = collection(db, "plots");
  const unsubscribe = onSnapshot(plotsRef, 
    { includeMetadataChanges: false }, // Skip metadata-only updates for speed
    (snapshot) => {
      if (snapshot.metadata.fromCache) {
        console.log('📦 From Firestore cache');
        return; // Skip if from cache (already loaded above)
      }
      const plots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      window.allPlots = plots;
      cachePlotsOffline(plots);
      setPlotsSyncStatus('synced');
      if (onDataUpdate) onDataUpdate(plots);
      console.log('✅ Synced fresh plots:', plots.length);
    }, 
    (error) => {
      console.error("Sync Error:", error);
      getPlotsFromCache().then(cached => {
        if (cached && cached.length > 0) {
          console.log('⚠️ Using cached plots (offline mode):', cached.length, 'plots');
          window.allPlots = cached;
          setPlotsSyncStatus('offline');
          if (onDataUpdate) onDataUpdate(cached);
        }
      });
    }
  );
  
  // Update timestamp display every minute
  setInterval(updateSyncTimestamp, 60000);
  
  return unsubscribe;
}

// Restore sync on reconnect
window.onOnlineRestore = () => {
  console.log('🔄 Reconnected - syncing plots...');
  setPlotsSyncStatus('syncing');
  updateSyncTimestamp();
};

// --- 4. ADMIN UPDATE PLOT ---
// Saves Status, Price, Total, and Remarks
export async function updatePlotInCloud(plotId, data) {
    if (!plotId) return false;
    const plotRef = doc(db, "plots", plotId);
    
    try {
        await updateDoc(plotRef, {
            status: data.status,
            pricePerAnkanam: data.price,
            totalPrice: data.total,
            remarks: data.remarks,
            lastUpdated: new Date().toISOString()
        });
        return true;
    } catch (e) {
        console.error("Update Error:", e);
        alert("Failed to save: " + e.message);
        return false;
    }
}

// --- 5. LOGOUT ---
export function logout() {
    sessionStorage.clear();
    window.location.href = "login.html";
}