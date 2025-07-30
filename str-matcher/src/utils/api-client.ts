import { logger } from './logger';
import { notifications } from './notifications';
import { STRProfile } from './constants';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly cacheDuration = 5 * 60 * 1000; // 5 минут

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
    this.cache = new Map();
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
      retries = 3,
      cache = false
    } = config;

    const url = this.baseUrl + endpoint;
    const cacheKey = `${method}:${url}:${JSON.stringify(body)}`;

    // Проверка кэша
    if (cache && method === 'GET') {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) return cachedData;
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            ...this.defaultHeaders,
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const apiResponse = {
          data,
          status: response.status,
          headers: response.headers
        };

        // Кэширование успешного ответа
        if (cache && method === 'GET') {
          this.setCachedData(cacheKey, apiResponse);
        }

        return apiResponse;

      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error(`API request failed (attempt ${attempt + 1}/${retries})`, error);
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        // Ждем перед повторной попыткой
        if (attempt < retries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  // Методы для работы с профилями
  async fetchProfiles(): Promise<STRProfile[]> {
    const response = await this.request<STRProfile[]>('/profiles', {
      cache: true
    });
    return response.data;
  }

  async createProfile(profile: STRProfile): Promise<STRProfile> {
    const response = await this.request<STRProfile>('/profiles', {
      method: 'POST',
      body: profile
    });
    return response.data;
  }

  async updateProfile(id: string, profile: Partial<STRProfile>): Promise<STRProfile> {
    const response = await this.request<STRProfile>(`/profiles/${id}`, {
      method: 'PUT',
      body: profile
    });
    return response.data;
  }

  async deleteProfile(id: string): Promise<void> {
    await this.request(`/profiles/${id}`, {
      method: 'DELETE'
    });
  }

  // Методы для работы с внешними базами данных
  async fetchExternalDatabase(url: string): Promise<STRProfile[]> {
    const response = await this.request<STRProfile[]>('/external-db', {
      method: 'POST',
      body: { url }
    });
    return response.data;
  }

  // Приватные вспомогательные методы
  private getCachedData(key: string): ApiResponse<any> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: ApiResponse<any>): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Очистка старого кэша
    if (this.cache.size > 100) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Очистка кэша
  clearCache(): void {
    this.cache.clear();
  }
}

// Экспортируем синглтон
export const apiClient = ApiClient.getInstance();
