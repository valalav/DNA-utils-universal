import { palindromes } from './constants';

interface MarkerInfo {
  name: string;
  aliases?: string[];
  isPalindromic: boolean;
  valueCount?: number;
  description?: string;
}

export const markerInfo: Record<string, MarkerInfo> = {
  // DYS маркеры
  DYS393: {
    name: 'DYS393',
    isPalindromic: false,
    description: 'Common STR marker, relatively stable'
  },
  DYS390: {
    name: 'DYS390',
    isPalindromic: false,
    description: 'Part of minimal haplotype'
  },
  DYS19: {
    name: 'DYS19',
    aliases: ['DYS394'],
    isPalindromic: false,
    description: 'Also known as DYS394'
  },
  DYS385: {
    name: 'DYS385',
    aliases: ['DYS385a,b'],
    isPalindromic: true,
    valueCount: 2,
    description: 'Multi-copy marker, requires two values'
  },
  // Добавьте другие маркеры по аналогии...
};

export function validateMarkerValue(marker: string, value: string): boolean {
  if (!(marker in markerInfo)) return false;

  const info = markerInfo[marker];
  
  if (info.isPalindromic) {
    const values = value.split(/[-,]/);
    if (info.valueCount && values.length !== info.valueCount) return false;
    
    return values.every(v => {
      const num = parseInt(v);
      return !isNaN(num) && num > 0;
    });
  }

  const num = parseInt(value);
  return !isNaN(num) && num > 0;
}

export function normalizeMarkerValue(marker: string, value: string): string {
  if (!(marker in markerInfo)) return value;

  const info = markerInfo[marker];
  
  if (info.isPalindromic) {
    const values = value.split(/[-,]/).map(v => v.trim());
    if (info.valueCount && values.length === info.valueCount) {
      // Сортируем значения для палиндромных маркеров
      return values
        .map(v => parseInt(v))
        .sort((a, b) => a - b)
        .join('-');
    }
  }

  return value.trim();
}

export function getMarkerRange(marker: string): [number, number] | null {
  // Типичные диапазоны значений для маркеров
  const ranges: Record<string, [number, number]> = {
    DYS393: [9, 17],
    DYS390: [17, 28],
    DYS19: [10, 19],
    // Добавьте другие маркеры...
  };

  return ranges[marker] || null;
}

export function isMarkerValue(marker: string, value: string): boolean {
  const range = getMarkerRange(marker);
  if (!range) return true; // Если диапазон неизвестен, пропускаем проверку

  const [min, max] = range;
  const num = parseInt(value);
  return !isNaN(num) && num >= min && num <= max;
}

export function formatMarkerValue(marker: string, value: string): string {
  if (!value) return '';
  
  const info = markerInfo[marker];
  if (!info) return value;

  if (info.isPalindromic) {
    const values = value.split(/[-,]/);
    if (info.valueCount && values.length === info.valueCount) {
      return values.join('-');
    }
  }

  return value;
}

// Утилита для сравнения маркеров
export function compareMarkerValues(
  marker: string,
  value1: string,
  value2: string
): number {
  if (marker in palindromes) {
    const values1 = value1.split(/[-,]/).map(Number);
    const values2 = value2.split(/[-,]/).map(Number);
    
    if (values1.length !== values2.length) return NaN;
    
    let totalDiff = 0;
    for (let i = 0; i < values1.length; i++) {
      if (isNaN(values1[i]) || isNaN(values2[i])) return NaN;
      totalDiff += Math.abs(values1[i] - values2[i]);
    }
    return totalDiff;
  }

  const num1 = parseInt(value1);
  const num2 = parseInt(value2);
  if (isNaN(num1) || isNaN(num2)) return NaN;
  
  return Math.abs(num1 - num2);
}