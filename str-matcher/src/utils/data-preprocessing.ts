import { STRProfile } from './constants';
import { logger } from './logger';
import { normalizeString } from './formatters';

export class DataPreprocessor {
  // Нормализация профиля
  static normalizeProfile(profile: STRProfile): STRProfile {
    try {
      return {
        kitNumber: this.normalizeKitNumber(profile.kitNumber),
        name: profile.name ? this.normalizeName(profile.name) : undefined,
        country: profile.country ? this.normalizeCountry(profile.country) : undefined,
        haplogroup: profile.haplogroup ? this.normalizeHaplogroup(profile.haplogroup) : undefined,
        markers: this.normalizeMarkers(profile.markers)
      };
    } catch (error) {
      logger.error('Error normalizing profile', error as Error);
      throw error;
    }
  }

  // Нормализация Kit Number
  static normalizeKitNumber(kitNumber: string): string {
    return kitNumber.trim().toUpperCase()
      .replace(/[^\w-]/g, '') // Убираем все кроме букв, цифр и дефиса
      .replace(/^0+/, '');    // Убираем ведущие нули
  }

  // Нормализация имени
  static normalizeName(name: string): string {
    return name.trim()
      .replace(/\s+/g, ' ')   // Заменяем множественные пробелы на один
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Оставляем только буквы, цифры, пробелы и дефисы
      .replace(/\b\w/g, c => c.toUpperCase()); // Первая буква каждого слова заглавная
  }

  // Нормализация страны
  static normalizeCountry(country: string): string {
    const normalized = normalizeString(country);
    
    // Мапим сокращения и альтернативные названия
    const countryMap: Record<string, string> = {
      'usa': 'United States',
      'uk': 'United Kingdom',
      'uae': 'United Arab Emirates',
      // Добавить другие маппинги...
    };

    return countryMap[normalized] || this.capitalizeWords(country);
  }

  // Нормализация гаплогруппы
  static normalizeHaplogroup(haplogroup: string): string {
    return haplogroup.trim()
      .toUpperCase()
      .replace(/\s+/g, '')    // Убираем все пробелы
      .replace(/^([A-Z])(\d)/, '$1-$2'); // Добавляем дефис между буквой и цифрой если его нет
  }

  // Нормализация маркеров
  static normalizeMarkers(markers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};

    Object.entries(markers).forEach(([key, value]) => {
      const normalizedKey = this.normalizeMarkerKey(key);
      const normalizedValue = this.normalizeMarkerValue(value);
      
      if (normalizedValue !== null) {
        normalized[normalizedKey] = normalizedValue;
      }
    });

    return normalized;
  }

  // Нормализация ключа маркера
  static normalizeMarkerKey(key: string): string {
    return key.trim()
      .toUpperCase()
      .replace(/\s+/g, '')    // Убираем все пробелы
      .replace(/^DYS0+/, 'DYS'); // Убираем ведущие нули после DYS
  }

  // Нормализация значения маркера
  static normalizeMarkerValue(value: string): string | null {
    const normalized = value.trim().replace(/\s+/g, '');
    
    // Проверяем, что значение состоит только из цифр или цифр с дефисом
    if (!/^(\d+|-?\d+(?:-\d+)*)$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  // Очистка набора профилей от дубликатов
  static removeDuplicates(profiles: STRProfile[]): STRProfile[] {
    const seen = new Set<string>();
    
    return profiles.filter(profile => {
      const key = profile.kitNumber;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Исправление распространенных ошибок в данных
  static fixCommonErrors(profile: STRProfile): STRProfile {
    return {
      ...profile,
      markers: Object.entries(profile.markers).reduce((acc, [key, value]) => {
        // Исправление известных ошибок в значениях маркеров
        const fixedValue = this.fixMarkerValue(key, value);
        if (fixedValue !== null) {
          acc[key] = fixedValue;
        }
        return acc;
      }, {} as Record<string, string>)
    };
  }

  // Проверка целостности данных
  static validateIntegrity(profile: STRProfile): boolean {
    // Проверка обязательных полей
    if (!profile.kitNumber || !profile.markers) return false;

    // Проверка формата Kit Number
    if (!/^[A-Z0-9-]+$/.test(profile.kitNumber)) return false;

    // Проверка значений маркеров
    for (const [key, value] of Object.entries(profile.markers)) {
      if (!this.isValidMarkerValue(key, value)) return false;
    }

    return true;
  }

  // Приватные вспомогательные методы
  private static capitalizeWords(str: string): string {
    return str.trim()
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private static isValidMarkerValue(marker: string, value: string): boolean {
    // Проверка формата значения маркера
    if (marker.includes('385') || marker.includes('459')) {
      // Проверка формата для мультикопийных маркеров
      return /^\d+-\d+$/.test(value);
    }
    return /^\d+$/.test(value);
  }

  private static fixMarkerValue(marker: string, value: string): string | null {
    // Исправление известных ошибок в значениях
    const commonErrors: Record<string, string> = {
      'O': '0',
      'l': '1',
      'I': '1',
      // Добавить другие известные ошибки...
    };

    let fixed = value;
    for (const [error, correction] of Object.entries(commonErrors)) {
      fixed = fixed.replace(new RegExp(error, 'g'), correction);
    }

    return this.isValidMarkerValue(marker, fixed) ? fixed : null;
  }
}

// Экспортируем вспомогательные функции
export const normalizeProfile = DataPreprocessor.normalizeProfile.bind(DataPreprocessor);
export const removeDuplicates = DataPreprocessor.removeDuplicates.bind(DataPreprocessor);
export const validateIntegrity = DataPreprocessor.validateIntegrity.bind(DataPreprocessor);
