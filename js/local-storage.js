// Local IndexedDB Storage for Offline Support
const DB_NAME = 'rvr-gpc-db';
const DB_VERSION = 1;

let db;

// Initialize IndexedDB
export function initLocalDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Store enquiries locally before sync
      if (!database.objectStoreNames.contains('enquiries')) {
        database.createObjectStore('enquiries', { keyPath: 'id', autoIncrement: true });
      }
      
      // Store favourite plots
      if (!database.objectStoreNames.contains('favourites')) {
        database.createObjectStore('favourites', { keyPath: 'plotId' });
      }
      
      // Store draft reviews
      if (!database.objectStoreNames.contains('draftReviews')) {
        database.createObjectStore('draftReviews', { keyPath: 'id', autoIncrement: true });
      }
      
      // Store user preferences
      if (!database.objectStoreNames.contains('preferences')) {
        database.createObjectStore('preferences', { keyPath: 'key' });
      }
      
      // Cache synced plots locally
      if (!database.objectStoreNames.contains('cachedPlots')) {
        database.createObjectStore('cachedPlots', { keyPath: 'id' });
      }
    };
  });
}

// Save Enquiry Offline
export async function saveEnquiryOffline(enquiryData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['enquiries'], 'readwrite');
    const store = transaction.objectStore('enquiries');
    const request = store.add({
      ...enquiryData,
      timestamp: new Date().toISOString(),
      synced: false
    });
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get All Offline Enquiries
export async function getOfflineEnquiries() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['enquiries'], 'readonly');
    const store = transaction.objectStore('enquiries');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Mark Enquiry as Synced
export async function markEnquirySynced(enquiryId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['enquiries'], 'readwrite');
    const store = transaction.objectStore('enquiries');
    const request = store.get(enquiryId);
    
    request.onsuccess = () => {
      const enquiry = request.result;
      enquiry.synced = true;
      store.put(enquiry);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Save Favourite Plot
export async function addToFavourites(plotId, plotName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['favourites'], 'readwrite');
    const store = transaction.objectStore('favourites');
    const request = store.add({
      plotId,
      plotName,
      addedAt: new Date().toISOString()
    });
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Remove Favourite Plot
export async function removeFromFavourites(plotId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['favourites'], 'readwrite');
    const store = transaction.objectStore('favourites');
    const request = store.delete(plotId);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Get All Favourites
export async function getFavourites() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['favourites'], 'readonly');
    const store = transaction.objectStore('favourites');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save Draft Review
export async function saveDraftReview(reviewData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['draftReviews'], 'readwrite');
    const store = transaction.objectStore('draftReviews');
    const request = store.add({
      ...reviewData,
      savedAt: new Date().toISOString()
    });
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save User Preference
export async function setPreference(key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['preferences'], 'readwrite');
    const store = transaction.objectStore('preferences');
    const request = store.put({ key, value });
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Get User Preference
export async function getPreference(key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['preferences'], 'readonly');
    const store = transaction.objectStore('preferences');
    const request = store.get(key);
    
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

// Cache Plots Locally
export async function cachePlotsLocally(plots) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['cachedPlots'], 'readwrite');
    const store = transaction.objectStore('cachedPlots');
    
    // Clear old cache
    store.clear();
    
    // Add new plots
    plots.forEach(plot => {
      store.add(plot);
    });
    
    resolve();
  });
}

// Get Cached Plots
export async function getCachedPlots() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['cachedPlots'], 'readonly');
    const store = transaction.objectStore('cachedPlots');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLocalDB);
} else {
  initLocalDB();
}
