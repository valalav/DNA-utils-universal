import { logger } from './logger';
import { STRProfile } from './constants';

interface StorageOptions {
  prefix?: string;
  serialize?: boolean;
}

class StorageManager {
  private static instance: StorageManager;
  private prefix: string;

  private constructor(prefix: string = 'str_matcher_') {
    this.prefix = prefix;
  }

  static getInstance(prefix?: string): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager(prefix);
    }
    return StorageManager.instance;
  }

  // Методы для работы с localStorage
  setItem(key: string, value: any, options: StorageOptions = {}): boolean {
    try {
      const fullKey = this.getFullKey(key, options.prefix);
      const serializedValue = options.serialize !== false 
        ? JSON.stringify(value)
        : value;

      localStorage.setItem(fullKey, serializedValue);
      return true;
    } catch (error) {
      logger.error('Error saving to localStorage', error as Error);
      return false;
    }
  }

  getItem<T>(key: string, options: StorageOptions = {}): T | null {
    try {
      const fullKey = this.getFullKey(key, options.prefix);
      const value = localStorage.getItem(fullKey);

      if (value === null) return null;

      return options.serialize !== false 
        ? JSON.parse(value)
        : value as T;
    } catch (error) {
      logger.error('Error reading from localStorage', error as Error);
      return null;
    }
  }

  removeItem(key: string, options: StorageOptions = {}): boolean {
    try {
      const fullKey = this.getFullKey(key, options.prefix);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      logger.error('Error removing from localStorage', error as Error);
      return false;
    }
  }

  // Методы для работы с профилями
  saveProfile(profile: STRProfile): boolean {
    return this.setItem(`profile_${profile.kitNumber}`, profile);
  }

  getProfile(kitNumber: string): STRProfile | null {
    return this.getItem(`profile_${kitNumber}`);
  }

  removeProfile(kitNumber: string): boolean {
    return this.removeItem(`profile_${kitNumber}`);
  }

  // Методы для работы с настройками
  saveSettings(settings: Record<string, any>): boolean {
    return this.setItem('settings', settings);
  }

  getSettings(): Record<string, any> | null {
    return this.getItem('settings');
  }

  // Методы для работы с историей поиска
  addToSearchHistory(query: string): boolean {
    const history = this.getSearchHistory();
    const updatedHistory = [
      query,
      ...history.filter(q => q !== query)
    ].slice(0, 10);

    return this.setItem('search_history', updatedHistory);
  }

  getSearchHistory(): string[] {
    return this.getItem('search_history') || [];
  }

  clearSearchHistory(): boolean {
    return this.removeItem('search_history');
  }

  // Приватные вспомогательные методы
  private getFullKey(key: string, customPrefix?: string): string {
    return (customPrefix || this.prefix) + key;
  }

  // Методы для работы с ёмкостью хранилища
  getStorageUsage(): {
    used: number;
    total: number;
    items: number;
  } {
    let used = 0;
    let items = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
          items++;
        }
      }
    }

    return {
      used,
      total: 5 * 1024 * 1024, // Примерно 5MB
      items
    };
  }

  // Очистка старых данных
  clearOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            if (data.timestamp && now - data.timestamp > maxAge) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          logger.warn('Error parsing stored data', { key, error });
        }
      }
    }
  }

  // Экспорт/импорт данных
  exportData(): string {
    const data: Record<string, any> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          data[key.slice(this.prefix.length)] = JSON.parse(value);
        }
      }
    }

    return JSON.stringify(data);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      Object.entries(data).forEach(([key, value]) => {
        this.setItem(key, value);
      });

      return true;
    } catch (error) {
      logger.error('Error importing data', error as Error);
      return false;
    }
  }
}

// Экспортируем синглтон
export const storage = StorageManager.getInstance();
