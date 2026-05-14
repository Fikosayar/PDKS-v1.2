/**
 * Çevrimdışı kuyruk yönetimi - idb kütüphanesi ile IndexedDB
 * İnternet yokken giriş/çıkış hareketleri burada saklanır,
 * internet gelince otomatik olarak Firebase'e gönderilir.
 */

import { openDB, IDBPDatabase } from 'idb';
import { OfflineQueueItem } from '../types';

const DB_NAME = 'pdks-offline';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

async function getDB() {
  if (!dbInstance) {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbInstance;
}

export async function addToOfflineQueue(item: OfflineQueueItem): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, item);
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearOfflineQueue(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
