import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface MaktabDB extends DBSchema {
  schools: { key: string; value: any };
  students: { key: string; value: any };
  payments: { key: string; value: any };
  expenses: { key: string; value: any };
  staff: { key: string; value: any };
  offline_queue: { key: string; value: any; indexes: { 'by-timestamp': number } };
}

type StoreName = 'schools' | 'students' | 'payments' | 'expenses' | 'staff' | 'offline_queue';

let dbPromise: Promise<IDBPDatabase<MaktabDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MaktabDB>('maktab-manager', 1, {
      upgrade(db) {
        (['schools', 'students', 'payments', 'expenses', 'staff'] as const).forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
        if (!db.objectStoreNames.contains('offline_queue')) {
          const store = db.createObjectStore('offline_queue', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
};

export const idbGetAll = async <T>(storeName: StoreName): Promise<T[]> => {
  try {
    const db = await getDB();
    return (await db.getAll(storeName)) as T[];
  } catch {
    return [];
  }
};

export const idbPutAll = async (storeName: StoreName, items: any[]) => {
  try {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    // Clear existing and put all new items
    await tx.store.clear();
    await Promise.all(items.map(item => tx.store.put(item)));
    await tx.done;
  } catch { /* quota or error */ }
};

export const idbClear = async (storeName: StoreName) => {
  try {
    const db = await getDB();
    await db.clear(storeName);
  } catch { /* ignore */ }
};

// Queue-specific helpers
export const idbGetQueue = async (): Promise<any[]> => {
  try {
    const db = await getDB();
    return await db.getAllFromIndex('offline_queue', 'by-timestamp');
  } catch {
    return [];
  }
};

export const idbAddToQueue = async (item: any) => {
  try {
    const db = await getDB();
    await db.put('offline_queue', item);
  } catch { /* ignore */ }
};

export const idbClearQueue = async () => {
  try {
    const db = await getDB();
    await db.clear('offline_queue');
  } catch { /* ignore */ }
};

export const idbSaveQueue = async (items: any[]) => {
  try {
    const db = await getDB();
    const tx = db.transaction('offline_queue', 'readwrite');
    await tx.store.clear();
    await Promise.all(items.map(item => tx.store.put(item)));
    await tx.done;
  } catch { /* ignore */ }
};
