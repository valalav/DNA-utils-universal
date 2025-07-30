interface CacheOptions {
  ttl?: number;  // Time to live в миллисекундах
  maxSize?: number;  // Максимальный размер кэша
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  lastAccessed: number;
}

export class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private ttl: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 30 * 60 * 1000; // 30 минут по умолчанию
    this.maxSize = options.maxSize || 1000;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    const now = Date.now();
    
    // Проверка TTL
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Обновляем время последнего доступа
    entry.lastAccessed = now;
    return entry.value;
  }

  set(key: string, value: T): void {
    const now = Date.now();

    // Проверка размера кэша
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      lastAccessed: now
    });
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Проверка TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Получение статистики кэша
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalAccessTime = 0;
    let oldestEntryAge = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttl) {
        expiredCount++;
        this.cache.delete(key);
      } else {
        totalAccessTime += now - entry.lastAccessed;
        oldestEntryAge = Math.max(oldestEntryAge, now - entry.timestamp);
      }
    });

    return {
      size: this.cache.size,
      expiredCount,
      averageAccessTime: totalAccessTime / this.cache.size || 0,
      oldestEntryAge,
      hitRatio: this.hitCount / (this.hitCount + this.missCount)
    };
  }

  private hitCount = 0;
  private missCount = 0;
}

// Экспортируем экземпляр кэша для результатов сравнения
export const matchesCache = new Cache<any>({
  ttl: 5 * 60 * 1000, // 5 минут
  maxSize: 500
});