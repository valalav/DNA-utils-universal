import { STRProfile } from '@/utils/constants';

const DB_NAME = 'str_matcher_db';
const DB_VERSION = 1;

export class DatabaseManager {
  private db: IDBDatabase | null = null;
  private static instance: DatabaseManager | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async init(): Promise<void> {
    if (this.db) return;
  
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
  
      request.onerror = () => reject(new Error('Failed to open database'));
  
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (db.objectStoreNames.contains('profiles')) {
          db.deleteObjectStore('profiles');
        }
  
        const store = db.createObjectStore('profiles', { keyPath: 'kitNumber' });
        store.createIndex('orderIndex', 'orderIndex', { unique: false });
      };
  
      request.onsuccess = async () => {
        this.db = request.result;
        // Очищаем базу при каждом запуске
        await this.clearProfiles();
        resolve();
      };
    });
  }

  async saveProfiles(profiles: STRProfile[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profiles', 'readwrite');
      const store = tx.objectStore('profiles');

      console.log(`Начало сохранения ${profiles.length} профилей`);
      
      let completed = 0;

      profiles.forEach(profile => {
        const request = store.put(profile);
        request.onsuccess = () => {
          completed++;
          if (completed === profiles.length) {
            console.log(`Сохранено ${completed} профилей`);
          }
        };
      });

      tx.oncomplete = () => {
        console.log('Транзакция успешно завершена');
        resolve();
      };

      tx.onerror = () => {
        console.error('Ошибка транзакции:', tx.error);
        reject(tx.error);
      };
    });
  }

  async getProfiles(): Promise<STRProfile[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const request = store.getAll();

      request.onsuccess = () => {
        const profiles = request.result;
        console.log(`Получено ${profiles.length} профилей из базы`);
        resolve(profiles);
      };

      request.onerror = () => {
        console.error('Ошибка получения профилей:', request.error);
        reject(request.error);
      };
    });
  }

  async clearProfiles(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profiles', 'readwrite');
      const store = tx.objectStore('profiles');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('База очищена');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }
}

export const dbManager = DatabaseManager.getInstance();