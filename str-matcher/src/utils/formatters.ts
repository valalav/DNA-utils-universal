import { i18n } from './i18n';

export class Formatters {
  // Форматирование значений маркеров
  static formatMarkerValue(value: string | number, includeUnits = false): string {
    if (!value && value !== 0) return '-';
    const formatted = String(value).trim();
    return includeUnits ? `${formatted} repeats` : formatted;
  }

  // Форматирование генетической дистанции
  static formatGeneticDistance(distance: number): string {
    if (distance === 0) return '0';
    if (distance < 0) return '-';
    return distance.toFixed(1);
  }

  // Форматирование процентов
  static formatPercentage(value: number, decimals = 1): string {
    if (value < 0 || isNaN(value)) return '-';
    return `${value.toFixed(decimals)}%`;
  }

  // Форматирование дат
  static formatDate(date: Date | string | number): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return i18n.formatDate(d, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Форматирование относительных дат
  static formatRelativeDate(date: Date | string | number): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return i18n.t('time.justNow');
    } else if (diffInMinutes < 60) {
      return i18n.formatRelativeTime(-diffInMinutes, 'minute');
    } else if (diffInHours < 24) {
      return i18n.formatRelativeTime(-diffInHours, 'hour');
    } else if (diffInDays < 30) {
      return i18n.formatRelativeTime(-diffInDays, 'day');
    } else {
      return Formatters.formatDate(date);
    }
  }

  // Форматирование чисел
  static formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    if (isNaN(value)) return '-';
    return i18n.formatNumber(value, options);
  }

  // Форматирование размера файла
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // Форматирование длительности
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Форматирование имени файла
  static formatFileName(fileName: string, maxLength = 20): string {
    if (fileName.length <= maxLength) return fileName;
    const ext = fileName.split('.').pop();
    const name = fileName.substring(0, fileName.lastIndexOf('.'));
    return `${name.substring(0, maxLength - 3)}...${ext}`;
  }

  // Форматирование Kit Number
  static formatKitNumber(kitNumber: string): string {
    return kitNumber.toUpperCase().trim();
  }

  // Форматирование гаплогруппы
  static formatHaplogroup(haplogroup: string): string {
    return haplogroup.trim().toUpperCase();
  }

  // Форматирование результатов сравнения
  static formatComparisonResult(value: number): string {
    if (value === 0) return 'Match';
    if (value === 1) return 'Close';
    if (value === 2) return 'Distant';
    return 'No Match';
  }

  // Форматирование статуса
  static formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': i18n.t('status.pending'),
      'processing': i18n.t('status.processing'),
      'completed': i18n.t('status.completed'),
      'failed': i18n.t('status.failed'),
    };
    return statusMap[status] || status;
  }

  // Форматирование диапазона дат
  static formatDateRange(startDate: Date, endDate: Date): string {
    if (startDate.getFullYear() === endDate.getFullYear()) {
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${i18n.formatDate(startDate, { month: 'long', year: 'numeric' })}`;
      }
      return `${i18n.formatDate(startDate, { month: 'short' })} - ${i18n.formatDate(endDate, { month: 'short', year: 'numeric' })}`;
    }
    return `${i18n.formatDate(startDate, { month: 'short', year: 'numeric' })} - ${i18n.formatDate(endDate, { month: 'short', year: 'numeric' })}`;
  }

  // Форматирование разницы между маркерами
  static formatMarkerDifference(value1: string, value2: string): string {
    const num1 = parseInt(value1);
    const num2 = parseInt(value2);
    if (isNaN(num1) || isNaN(num2)) return '-';
    
    const diff = Math.abs(num1 - num2);
    if (diff === 0) return '=';
    return diff > 0 ? `+${diff}` : `${diff}`;
  }
}

// Вспомогательные функции для форматирования
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
}

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function formatMarkerValue(marker: string, value: string): string {
  return value.trim();
}