import { STRProfile, palindromes } from './constants';

// Встраиваем markerInfo прямо в файл
const markerInfo: Record<string, { minValue?: number; maxValue?: number }> = {
  DYS393: { minValue: 9, maxValue: 17 },
  DYS390: { minValue: 17, maxValue: 28 },
  DYS19: { minValue: 10, maxValue: 19 },
  DYS391: { minValue: 6, maxValue: 14 },
  DYS385: { minValue: 7, maxValue: 28 }
};

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  metadata?: {
    totalRecords: number;
    validRecords: number;
    uniqueKits: number;
  };
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class DataValidator {
  static validateProfile(profile: Partial<STRProfile>): ValidationResult {
    const errors: ValidationError[] = [];

    // Проверка обязательных полей
    if (!profile.kitNumber) {
      errors.push({
        field: 'kitNumber',
        message: 'Kit number is required',
        code: 'REQUIRED_FIELD'
      });
    } else if (!/^[A-Z0-9-]+$/i.test(profile.kitNumber)) {
      errors.push({
        field: 'kitNumber',
        message: 'Invalid kit number format',
        code: 'INVALID_FORMAT'
      });
    }

    // Проверка формата гаплогруппы
    if (profile.haplogroup && !/^[A-Z][0-9A-Z-]*$/i.test(profile.haplogroup)) {
      errors.push({
        field: 'haplogroup',
        message: 'Invalid haplogroup format',
        code: 'INVALID_FORMAT'
      });
    }

    // Проверка маркеров
    if (profile.markers) {
      Object.entries(profile.markers).forEach(([marker, value]) => {
        const validationError = this.validateMarkerValue(marker, value);
        if (validationError) {
          errors.push({
            field: `markers.${marker}`,
            message: validationError,
            code: 'INVALID_MARKER'
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateMarkerValue(marker: string, value: string): string | null {
    if (!value.trim()) return null; // Пустые значения разрешены

    // Проверка палиндромных маркеров
    if (marker in palindromes) {
      const values = value.split(/[-,]/);
      const expectedCount = palindromes[marker as keyof typeof palindromes];
      
      if (values.length !== expectedCount) {
        return `Expected ${expectedCount} values for ${marker}`;
      }

      for (const val of values) {
        if (!/^\d+$/.test(val.trim())) {
          return `Invalid value format for ${marker}`;
        }
      }
      return null;
    }

    // Проверка обычных маркеров
    if (!/^\d+$/.test(value.trim())) {
      return `Invalid value format for ${marker}`;
    }

    // Проверка диапазонов значений
    if (marker in markerInfo) {
      const info = markerInfo[marker];
      const numValue = parseInt(value);
      
      if (info.minValue && numValue < info.minValue) {
        return `Value too small for ${marker}`;
      }
      if (info.maxValue && numValue > info.maxValue) {
        return `Value too large for ${marker}`;
      }
    }

    return null;
  }

  static validateMarkers(markers: Record<string, string>): ValidationResult {
    const errors: ValidationError[] = [];
    let validMarkersCount = 0;

    Object.entries(markers).forEach(([marker, value]) => {
      const error = this.validateMarkerValue(marker, value);
      if (error) {
        errors.push({
          field: marker,
          message: error,
          code: 'INVALID_MARKER'
        });
      } else {
        validMarkersCount++;
      }
    });

    // Проверка минимального количества маркеров
    if (validMarkersCount < 12) {
      errors.push({
        field: 'markers',
        message: 'At least 12 valid markers are required',
        code: 'INSUFFICIENT_MARKERS'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateBatchData(data: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    let validRecords = 0;
    const kitNumbers = new Set<string>();

    data.forEach((record, index) => {
      // Проверка структуры записи
      if (!record || typeof record !== 'object') {
        errors.push({
          field: `record[${index}]`,
          message: 'Invalid record format',
          code: 'INVALID_FORMAT'
        });
        return;
      }

      // Проверка уникальности Kit Number
      if (record.kitNumber && kitNumbers.has(record.kitNumber)) {
        errors.push({
          field: `record[${index}].kitNumber`,
          message: 'Duplicate Kit Number',
          code: 'DUPLICATE_KIT'
        });
      } else if (record.kitNumber) {
        kitNumbers.add(record.kitNumber);
      }

      // Валидация каждой записи
      const validation = this.validateProfile(record);
      if (!validation.isValid) {
        errors.push(...validation.errors.map(error => ({
          ...error,
          field: `record[${index}].${error.field}`
        })));
      } else {
        validRecords++;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      metadata: {
        totalRecords: data.length,
        validRecords,
        uniqueKits: kitNumbers.size
      }
    };
  }

  // Вспомогательные методы
  static formatValidationErrors(errors: ValidationError[]): string[] {
    return errors.map(error => `${error.field}: ${error.message}`);
  }

  static getErrorSummary(result: ValidationResult): string {
    if (result.isValid) return 'Data is valid';
    
    const errorCounts: Record<string, number> = {};
    result.errors.forEach(error => {
      errorCounts[error.code] = (errorCounts[error.code] || 0) + 1;
    });

    return Object.entries(errorCounts)
      .map(([code, count]) => `${code}: ${count} errors`)
      .join('\n');
  }
}

// Экспортируем вспомогательные функции
export function isValidKitNumber(kitNumber: string): boolean {
  return /^[A-Z0-9-]+$/i.test(kitNumber);
}

export function isValidHaplogroup(haplogroup: string): boolean {
  return /^[A-Z][0-9A-Z-]*$/i.test(haplogroup);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[^\x20-\x7E]/g, '');
}
