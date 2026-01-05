const DB_NAME = 'valdris-living-world';
const STORE_NAME = 'world';

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.delete(handler);
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => handler(payload));
  }
}

class StorageAdapter {
  constructor() {
    this.memory = new Map();
  }

  async get(key) {
    if (typeof window === 'undefined') {
      return this.memory.get(key);
    }
    if (!('indexedDB' in window)) {
      return this.getLocal(key);
    }
    return this.getIndexed(key);
  }

  async set(key, value) {
    if (typeof window === 'undefined') {
      this.memory.set(key, value);
      return;
    }
    if (!('indexedDB' in window)) {
      return this.setLocal(key, value);
    }
    return this.setIndexed(key, value);
  }

  async update(key, updater, fallback) {
    const current = (await this.get(key)) ?? fallback;
    const next = updater(current);
    await this.set(key, next);
    return next;
  }

  async push(key, value) {
    return this.update(key, (arr) => [...arr, value], []);
  }

  async all() {
    if (typeof window === 'undefined') {
      return Array.from(this.memory.entries());
    }
    if (!('indexedDB' in window)) {
      return this.allLocal();
    }
    return this.allIndexed();
  }

  getLocal(key) {
    const raw = localStorage.getItem(`${DB_NAME}:${key}`);
    return raw ? JSON.parse(raw) : undefined;
  }

  setLocal(key, value) {
    localStorage.setItem(`${DB_NAME}:${key}`, JSON.stringify(value));
  }

  allLocal() {
    const entries = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(DB_NAME)) continue;
      const key = storageKey.split(':')[1];
      entries.push([key, JSON.parse(localStorage.getItem(storageKey))]);
    }
    return entries;
  }

  async getIndexed(key) {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async setIndexed(key, value) {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async allIndexed() {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => {
        const keys = request.result;
        const fetches = keys.map((key) => this.getIndexed(key).then((value) => [key, value]));
        Promise.all(fetches).then(resolve).catch(reject);
      };
      request.onerror = () => reject(request.error);
    });
  }

  openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

const eventBus = new EventBus();
const storage = new StorageAdapter();

async function seedIfNeeded(seedData) {
  const seeded = await storage.get('seeded');
  if (seeded) return;
  await storage.set('seeded', true);
  await Promise.all(
    Object.entries(seedData).map(([key, value]) => storage.set(key, value))
  );
}

export { eventBus, storage, seedIfNeeded };
