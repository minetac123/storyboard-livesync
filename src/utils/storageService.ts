import { StoryboardProject } from '../types/storyboard';

const DB_NAME = 'StoryboardLiveSyncDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'roomId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectToStorage(roomId: string, project: StoryboardProject): Promise<void> {
  if (typeof window === 'undefined' || !roomId) return;

  // 1. Zkusit uložit do IndexedDB (neomezená kapacita pro obrázky)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        roomId,
        project,
        updatedAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save fallback:', err);
  }

  // 2. Také uložit do localStorage jako zálohu (pokud se vejde do limitu)
  try {
    localStorage.setItem(`sb_proj_v3_${roomId}`, JSON.stringify(project));
    localStorage.setItem('sb_last_room', roomId);
  } catch (e) {
    // Quota exceeded in localStorage, IndexedDB still holds it
  }
}

export async function loadProjectFromStorage(roomId: string): Promise<StoryboardProject | null> {
  if (typeof window === 'undefined' || !roomId) return null;

  // 1. Zkusit načíst z IndexedDB
  try {
    const db = await openDB();
    const project = await new Promise<StoryboardProject | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(roomId);
      req.onsuccess = () => {
        if (req.result && req.result.project) {
          resolve(req.result.project);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });

    if (project) return project;
  } catch (err) {
    console.warn('IndexedDB load fallback:', err);
  }

  // 2. Záloha z localStorage
  try {
    const saved = localStorage.getItem(`sb_proj_v3_${roomId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // ignore
  }

  return null;
}
