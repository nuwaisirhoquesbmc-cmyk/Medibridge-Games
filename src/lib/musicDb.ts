/**
 * Helper to store and retrieve directly uploaded background music audio files in client's IndexedDB.
 * Since Firestore has a strict 1MB limit, IndexedDB is the standard industry practice
 * for storing larger local assets (e.g. 5MB-20MB+ MP3/WAV/AAC songs) directly on the client.
 */
export async function saveMusicToIndexedDB(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MediBridgeMusicStore", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("music")) {
        db.createObjectStore("music");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction("music", "readwrite");
      const store = tx.objectStore("music");
      store.put(file, "bg_music");
      tx.oncomplete = () => resolve();
      tx.onerror = (err: any) => reject(err);
    };
    request.onerror = (err) => reject(err);
  });
}

export async function getMusicFromIndexedDB(): Promise<File | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open("MediBridgeMusicStore", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("music")) {
        db.createObjectStore("music");
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("music")) {
        resolve(null);
        return;
      }
      const tx = db.transaction("music", "readonly");
      const store = tx.objectStore("music");
      const getReq = store.get("bg_music");
      getReq.onsuccess = () => {
        resolve(getReq.result || null);
      };
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

export async function clearMusicFromIndexedDB(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.open("MediBridgeMusicStore", 1);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("music")) {
        resolve();
        return;
      }
      const tx = db.transaction("music", "readwrite");
      const store = tx.objectStore("music");
      store.delete("bg_music");
      tx.oncomplete = () => resolve();
    };
    request.onerror = () => resolve();
  });
}
