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

export interface GeneticDistanceResult {
  distance: number;
  comparedMarkers: number;
  identicalMarkers: number;
  percentIdentical: number;
  hasAllRequiredMarkers: boolean;
}

export function calculateGeneticDistance(
  profile1: Record<string, string>,
  profile2: Record<string, string>, 
  selectedMarkerCount: MarkerCount,
  mode: CalculationMode = { type: 'standard' }
): GeneticDistanceResult {
  // Get markers based on selected count
  const markersToCompare = typeof selectedMarkerCount === 'string' && selectedMarkerCount === 'GP' 
    ? markerGroups.GP 
    : markerGroups[selectedMarkerCount];
  
  const activeMarkers = markersToCompare.filter(marker => 
    marker in profile1 && profile1[marker]?.trim()
  );

  const minRequired = Math.ceil(activeMarkers.length * 0.8);
  
  let totalDistance = 0;
  let comparedCount = 0;
  let identicalCount = 0;

  // Сначала собираем все значения для полиндромов
  const palindromeValues: Record<string, { values1: string, values2: string }> = {};
  
  for (const marker of activeMarkers) {
    const value1 = profile1[marker]?.trim();
    const value2 = profile2[marker]?.trim();

    if (!value1 || !value2) continue;

    comparedCount++;
    
    // Определяем базовое имя маркера
    const baseMarker = marker.replace(/[ab]$/, '');
    const isPalindrome = baseMarker in palindromes;

    if (isPalindrome) {
      // Для полиндромов собираем значения
      if (!palindromeValues[baseMarker]) {
        palindromeValues[baseMarker] = { values1: value1, values2: value2 };
      } else {
        palindromeValues[baseMarker].values1 += `-${value1}`;
        palindromeValues[baseMarker].values2 += `-${value2}`;
      }
    } else {
      // Для обычных маркеров считаем разницу сразу
      const diff = calculateMarkerDifference(value1, value2, marker, false, mode);
      if (!isNaN(diff)) {
        totalDistance += diff;
        if (diff === 0) {
          identicalCount++;
        }
      }
    }
  }

  // Теперь обрабатываем полиндромы
  for (const [baseMarker, { values1, values2 }] of Object.entries(palindromeValues)) {
    const diff = calculateMarkerDifference(values1, values2, baseMarker, true, mode);
    if (!isNaN(diff)) {
      totalDistance += diff;
      if (diff === 0) {
        identicalCount++;
      }
    }
  }

  if (comparedCount < minRequired) {
    return {
      distance: 0,
      comparedMarkers: comparedCount,
      identicalMarkers: identicalCount,
      percentIdentical: 0,
      hasAllRequiredMarkers: false
    };
  }

  return {
    distance: totalDistance,
    comparedMarkers: comparedCount,
    identicalMarkers: identicalCount,
    percentIdentical: (identicalCount / comparedCount) * 100,
    hasAllRequiredMarkers: true
  };
}

export interface MarkerRarityResult {
  rarity: number;
  rarityStyle?: React.CSSProperties;
}

export function calculateMarkerRarity(
  matches: STRMatch[],
  marker: string,
  value: string,
  queryValue: string
): MarkerRarityResult {
  // Skip calculation if values don't match
  if (value !== queryValue) {
    return { rarity: 0, rarityStyle: undefined };
  }

  const totalProfiles = matches.length;
  if (totalProfiles < 5) return { rarity: 0, rarityStyle: undefined };

  const matchingRecords = matches.filter(match => 
    match.profile.markers[marker] === value
  );

  const percentage = (matchingRecords.length / totalProfiles) * 100;

  // Set background color based on rarity
  let backgroundColor;
  if (percentage <= 4) backgroundColor = 'var(--rarity-1)';
  else if (percentage <= 8) backgroundColor = 'var(--rarity-2)';
  else if (percentage <= 12) backgroundColor = 'var(--rarity-3)';
  else if (percentage <= 20) backgroundColor = 'var(--rarity-4)';
  else if (percentage <= 33) backgroundColor = 'var(--rarity-5)';
  else return { rarity: percentage, rarityStyle: undefined };

  return {
    rarity: percentage,
    rarityStyle: {
      backgroundColor,
      color: backgroundColor === 'var(--rarity-5)' ? 'var(--text-primary)' : 'white',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  };
}

export const calculateDistance = (
  markers1: Record<string, string>,
  markers2: Record<string, string>
): number => {
  // TODO: Реализовать расчет генетического расстояния
  return 0;
};

export const findMatches = (
  query: Profile,
  database: Profile[],
  options: {
    maxDistance: number,
    markerCount: MarkerCount,
    haplogroupFilter?: HaplogroupFilter
  }
) => {
  let matches = database.filter(profile => {
    // Сначала проверяем количество маркеров
    const geneticResult = calculateGeneticDistance(query.markers, profile.markers, options.markerCount);
    
    // Если у профиля недостаточно маркеров - пропускаем его
    if (!geneticResult.hasAllRequiredMarkers) {
      return false;
    }

    // Проверяем генетическую дистанцию
    if (geneticResult.distance > options.maxDistance) {
      return false;
    }
    
    // Фильтрация по гаплогруппам
    if (options.haplogroupFilter) {
      const { includeGroups, excludeGroups, includeSubclades } = options.haplogroupFilter;
      
      // Проверяем исключения
      if (excludeGroups.some((group: string) => 
        isHaplogroupMatch(profile.haplogroup || '', group, includeSubclades)
      )) {
        return false;
      }
      
      // Проверяем включения
      if (includeGroups.length && !includeGroups.some((group: string) =>
        isHaplogroupMatch(profile.haplogroup || '', group, includeSubclades)
      )) {
        return false;
      }
    }
    
    return true;
  });
  
  return matches;
};

const isHaplogroupMatch = (
  profileHaplogroup: string,
  filterHaplogroup: string,
  includeSubclades: boolean
): boolean => {
  if (!includeSubclades) {
    return profileHaplogroup === filterHaplogroup;
  }
  
  return profileHaplogroup.startsWith(filterHaplogroup);
};

export async function processMatches(matches: Match[], filters: Filters): Promise<Match[]> {
    if (filters.haplogroups.length === 0) return matches;

    const filteredMatches: Match[] = [];
    for (const match of matches) {
        if (!match.haplogroup) continue;

        let include = false;
        for (const filterHaplo of filters.haplogroups) {
            try {
                const response = await axios.post<{ isSubclade: boolean }>('http://localhost:4001/api/check-subclade', {
                    haplogroup: match.haplogroup,
                    parentHaplogroup: filterHaplo
                });
                
                if (response.data.isSubclade) {
                    include = true;
                    break;
                }
            } catch (error) {
                console.error('Error checking subclade:', error);
            }
        }
        if (include) {
            filteredMatches.push(match);
        }
    }
    return filteredMatches;
}