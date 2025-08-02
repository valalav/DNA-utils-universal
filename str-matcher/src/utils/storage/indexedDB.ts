import { STRProfile } from '@/utils/constants';

const DB_NAME = 'str_matcher_db';
const DB_VERSION = 2; // ⚡ Увеличиваю версию для новых индексов

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
  
        // ⚡ Создаем store с оптимизированными индексами
        const store = db.createObjectStore('profiles', { keyPath: 'kitNumber' });
        
        // ⚡ Индексы для быстрой фильтрации
        store.createIndex('orderIndex', 'orderIndex', { unique: false });
        store.createIndex('haplogroup', 'haplogroup', { unique: false });
        store.createIndex('ancestralOrigin', 'ancestralOrigin', { unique: false });
        
        // ⚡ Композитные индексы для сложных запросов
        store.createIndex('haplogroup_origin', ['haplogroup', 'ancestralOrigin'], { unique: false });
        
        // ⚡ Индексы для быстрого подсчета маркеров (добавим позже)
        console.log('🔧 База обновлена с новыми индексами для производительности');
      };
  
      request.onsuccess = async () => {
        this.db = request.result;
        // ✅ НЕ очищаем базу! Сохраняем данные между сессиями
        console.log('✅ База инициализирована, данные сохранены');
        resolve();
      };
    });
  }
  // ⚡ ОПТИМИЗИРОВАННОЕ СОХРАНЕНИЕ: Batch операции вместо отдельных put()
  async saveProfiles(profiles: STRProfile[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const BATCH_SIZE = 1000; // Сохраняем порциями по 1000
    
    console.log(`🚀 Начало оптимизированного сохранения ${profiles.length} профилей`);
    
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      
      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction('profiles', 'readwrite');
        const store = tx.objectStore('profiles');

        batch.forEach(profile => store.put(profile));

        tx.oncomplete = () => {
          console.log(`✅ Сохранен batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(profiles.length/BATCH_SIZE)}`);
          resolve();
        };

        tx.onerror = () => {
          console.error('❌ Ошибка batch сохранения:', tx.error);
          reject(tx.error);
        };
      });
      
      // ⚡ Пауза между batch'ами чтобы не блокировать UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log(`🎉 Сохранено ${profiles.length} профилей оптимизированно`);
  }

  // 🔄 НАКОПИТЕЛЬНОЕ СОХРАНЕНИЕ: Объединяет новые профили с существующими без дублей
  async mergeProfiles(newProfiles: STRProfile[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    console.log(`🔄 Начало накопительного сохранения ${newProfiles.length} профилей`);
    
    try {
      // Получаем существующие профили
      const existingProfiles = await this.getProfiles().catch(() => []);
      
      // Объединяем профили (дубли по kitNumber будут перезаписаны новыми)
      const profileMap = new Map<string, STRProfile>();
      
      // Сначала добавляем существующие
      existingProfiles.forEach(profile => {
        if (profile.kitNumber) {
          profileMap.set(profile.kitNumber, profile);
        }
      });
      
      // Затем добавляем новые (перезаписывая дубли)
      newProfiles.forEach(profile => {
        if (profile.kitNumber) {
          profileMap.set(profile.kitNumber, profile);
        }
      });
      
      const mergedProfiles = Array.from(profileMap.values());
      
      // Очищаем и сохраняем объединенные профили
      await this.clearProfiles();
      await this.saveProfiles(mergedProfiles);
      
      console.log(`🔄 Накопительное сохранение завершено: ${existingProfiles.length} + ${newProfiles.length} = ${mergedProfiles.length} (исключено дублей: ${existingProfiles.length + newProfiles.length - mergedProfiles.length})`);
    } catch (error) {
      console.error('❌ Ошибка накопительного сохранения:', error);
      throw error;
    }
  }

  // ⚡ ПОТОКОВОЕ ЧТЕНИЕ: Вместо getAll() - читаем порциями через cursor
  async streamProfiles(
    callback: (profiles: STRProfile[]) => void,
    batchSize: number = 1000,
    filter?: (profile: STRProfile) => boolean
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const request = store.openCursor();
      
      let batch: STRProfile[] = [];
      let totalProcessed = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const profile = cursor.value as STRProfile;
          
          // ⚡ Применяем фильтр если задан
          if (!filter || filter(profile)) {
            batch.push(profile);
          }
          
          // ⚡ Отправляем batch когда накопилось достаточно
          if (batch.length >= batchSize) {
            callback(batch);
            totalProcessed += batch.length;
            batch = [];
          }
          
          cursor.continue();
        } else {
          // ⚡ Отправляем последний batch
          if (batch.length > 0) {
            callback(batch);
            totalProcessed += batch.length;
          }
          console.log(`🔄 Потоково обработано ${totalProcessed} профилей`);
          resolve();
        }
      };

      request.onerror = () => {
        console.error('❌ Ошибка потокового чтения:', request.error);
        reject(request.error);
      };
    });
  }
  // ⚡ БЫСТРАЯ СТАТИСТИКА: Подсчет без загрузки данных
  async getProfilesCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ⚡ БЫСТРЫЙ ПОИСК: Получить профиль по kit number без сканирования всей базы  
  async getProfileByKitNumber(kitNumber: string): Promise<STRProfile | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const request = store.get(kitNumber);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ⚡ ИНДЕКСИРОВАННАЯ ФИЛЬТРАЦИЯ: Быстрый поиск по гаплогруппе
  async getProfilesByHaplogroup(haplogroup: string): Promise<STRProfile[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const index = store.index('haplogroup');
      const request = index.getAll(haplogroup);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ⚡ ПРОВЕРКА СУЩЕСТВОВАНИЯ: Есть ли данные в базе
  async hasProfiles(): Promise<boolean> {
    try {
      const count = await this.getProfilesCount();
      return count > 0;
    } catch (error) {
      console.error('Ошибка проверки наличия профилей:', error);
      return false;
    }
  }
  // ⚠️ ОБРАТНАЯ СОВМЕСТИМОСТЬ: Старый метод getProfiles (для постепенного перехода)
  // ИСПОЛЬЗОВАТЬ ТОЛЬКО ДЛЯ МАЛЫХ БАЗ (<10k профилей)!
  async getProfiles(): Promise<STRProfile[]> {
    if (!this.db) throw new Error('Database not initialized');

    const count = await this.getProfilesCount();
    if (count > 10000) {
      console.warn(`⚠️ Попытка загрuzить ${count} профилей через getProfiles()! Используйте streamProfiles()`);
      throw new Error(`База слишком большая (${count} профилей). Используйте streamProfiles() для больших баз данных.`);
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const request = store.getAll(); // Оставляем для малых баз

      request.onsuccess = () => {
        const profiles = request.result;
        console.log(`📊 Получено ${profiles.length} профилей из базы (малая база)`);
        resolve(profiles);
      };

      request.onerror = () => {
        console.error('❌ Ошибка получения профилей:', request.error);
        reject(request.error);
      };
    });
  }

  // 🗑️ ОЧИСТКА БАЗЫ: Только когда действительно нужно
  async clearProfiles(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profiles', 'readwrite');
      const store = tx.objectStore('profiles');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ База очищена по запросу');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // 🔧 СЛУЖЕБНЫЕ МЕТОДЫ: Информация о базе
  async getDatabaseInfo(): Promise<{
    totalProfiles: number;
    dbVersion: number;
    hasData: boolean;
  }> {
    try {
      const totalProfiles = await this.getProfilesCount();
      return {
        totalProfiles,
        dbVersion: DB_VERSION,
        hasData: totalProfiles > 0
      };
    } catch (error) {
      console.error('Ошибка получения информации о базе:', error);
      return {
        totalProfiles: 0,
        dbVersion: DB_VERSION,
        hasData: false
      };
    }
  }
}

export const dbManager = DatabaseManager.getInstance();