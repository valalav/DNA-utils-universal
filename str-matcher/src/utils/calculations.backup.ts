import { markerGroups, palindromes } from './constants';
import type { STRMatch, MarkerCount } from './constants';
import type { Profile } from '@/types/profile';
import type { HaplogroupFilter } from '@/types/haplogroup';
import axios from 'axios';
import { Match, Filters } from '../types';

export interface CalculationMode {
  type: 'standard' | 'extended';
}

export function normalizeMarkerValue(value: string | number): number {
  if (typeof value === 'undefined' || value === null || value === '') return NaN;
  return parseInt(String(value).trim());
}

export function calculateMarkerDifference(
  value1: string,
  value2: string,
  marker: string,
  isPalindrome?: boolean,
  mode: CalculationMode = { type: 'standard' }
): number {
  if (!value1 || !value2) return 0;

  if (!isPalindrome) {
    const val1 = normalizeMarkerValue(value1);
    const val2 = normalizeMarkerValue(value2);
    if (isNaN(val1) || isNaN(val2)) return 0;

    // Для обычных маркеров - просто абсолютная разница с ограничением до 2
    return mode.type === 'standard' ? 
      Math.min(Math.abs(val2 - val1), 2) : 
      Math.abs(val2 - val1);
  }

  // Для полиндромов
  const vals1 = value1.split(/[-,]/).map(Number);
  const vals2 = value2.split(/[-,]/).map(Number);
  
  if (vals1.length !== vals2.length) return 0;

  let totalDiff = 0;
  
  // Считаем разницу для каждой пары значений
  for (let i = 0; i < vals1.length; i++) {
    if (isNaN(vals1[i]) || isNaN(vals2[i])) return 0;
    const diff = Math.abs(vals2[i] - vals1[i]);
    totalDiff += mode.type === 'standard' ? Math.min(diff, 2) : diff;
  }
  
  // Для полиндрома общая сумма тоже должна быть ограничена до 2!
  return mode.type === 'standard' ? Math.min(totalDiff, 2) : totalDiff;
}