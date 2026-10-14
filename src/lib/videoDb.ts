/**
 * Helper to store and retrieve directly uploaded campaign video files in client's IndexedDB.
 * Since Firestore has a strict 1MB limit, IndexedDB is the standard industry practice
 * for storing larger local assets (e.g. 50MB+ MP4 videos) directly on the client.
 */
export async function saveVideoToIndexedDB(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MediBridgeVideoStore", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("videos", "readwrite");
      const store = tx.objectStore("videos");
      store.put(file, "promo_video");
      tx.oncomplete = () => resolve();
      tx.onerror = (err: any) => reject(err);
    };
    request.onerror = (err) => reject(err);
  });
}

export async function getVideoFromIndexedDB(): Promise<File | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open("MediBridgeVideoStore", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("videos")) {
        resolve(null);
        return;
      }
      const tx = db.transaction("videos", "readonly");
      const store = tx.objectStore("videos");
      const getReq = store.get("promo_video");
      getReq.onsuccess = () => {
        resolve(getReq.result || null);
      };
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

export async function clearVideoFromIndexedDB(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.open("MediBridgeVideoStore", 1);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("videos")) {
        resolve();
        return;
      }
      const tx = db.transaction("videos", "readwrite");
      const store = tx.objectStore("videos");
      store.delete("promo_video");
      tx.oncomplete = () => resolve();
    };
    request.onerror = () => resolve();
  });
}
