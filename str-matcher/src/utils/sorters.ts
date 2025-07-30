import { STRProfile, STRMatch } from './constants';
import { normalizeMarkerValue } from './calculations';
import { logger } from './logger';

type SortDirection = 'asc' | 'desc';
type SortField = keyof STRProfile | keyof STRMatch['profile'] | 'distance' | 'percentIdentical';

interface SortOptions {
  direction?: SortDirection;
  nullsPosition?: 'first' | 'last';
  ignoreCase?: boolean;
}

export class Sorters {
  // Основная функция сортировки матчей
  static sortMatches(
    matches: STRMatch[],
    field: SortField = 'distance',
    options: SortOptions = {}
  ): STRMatch[] {
    const {
      direction = 'asc',
      nullsPosition = 'last',
      ignoreCase = true
    } = options;

    logger.debug('Sorting matches', { field, direction, nullsPosition });

    return [...matches].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      // Получаем значения для сравнения
      switch (field) {
        case 'distance':
          valueA = a.distance;
          valueB = b.distance;
          break;
        case 'percentIdentical':
          valueA = a.percentIdentical;
          valueB = b.percentIdentical;
          break;
        default:
          valueA = a.profile[field as keyof STRProfile];
          valueB = b.profile[field as keyof STRProfile];
      }

      // Обработка null значений
      if (valueA === null || valueA === undefined) {
        return nullsPosition === 'first' ? -1 : 1;
      }
      if (valueB === null || valueB === undefined) {
        return nullsPosition === 'first' ? 1 : -1;
      }

      // Сравнение значений
      let comparison = 0;
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        if (ignoreCase) {
          comparison = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
        } else {
          comparison = valueA.localeCompare(valueB);
        }
      } else {
        comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      }

      // Учитываем направление сортировки
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  // Сортировка маркеров по значению
  static sortMarkerValues(
    markers: Record<string, string>,
    direction: SortDirection = 'asc'
  ): Record<string, string> {
    const entries = Object.entries(markers);
    const sorted = entries.sort(([, valueA], [, valueB]) => {
      const numA = normalizeMarkerValue(valueA);
      const numB = normalizeMarkerValue(valueB);
      
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      
      return direction === 'asc' ? numA - numB : numB - numA;
    });

    return Object.fromEntries(sorted);
  }

  // Сортировка профилей по нескольким полям
  static multiSort(
    profiles: STRProfile[],
    sortFields: Array<{ field: keyof STRProfile; direction?: SortDirection }>
  ): STRProfile[] {
    return [...profiles].sort((a, b) => {
      for (const { field, direction = 'asc' } of sortFields) {
        const valueA = a[field];
        const valueB = b[field];

        if (valueA === valueB) continue;

        if (valueA === null || valueA === undefined) return 1;
        if (valueB === null || valueB === undefined) return -1;

        const comparison = 
          typeof valueA === 'string' && typeof valueB === 'string'
            ? valueA.localeCompare(valueB)
            : valueA < valueB ? -1 : 1;

        return direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }

  // Сортировка по генетической близости
  static sortByGeneticSimilarity(matches: STRMatch[]): STRMatch[] {
    return [...matches].sort((a, b) => {
      // Сначала по генетической дистанции
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      
      // Затем по проценту идентичных маркеров
      if (a.percentIdentical !== b.percentIdentical) {
        return b.percentIdentical - a.percentIdentical;
      }
      
      // Наконец по количеству сравненных маркеров
      return b.comparedMarkers - a.comparedMarkers;
    });
  }

  // Сортировка по редкости маркеров
  static sortByMarkerRarity(
    matches: STRMatch[],
    rareMarkers: Set<string>
  ): STRMatch[] {
    return [...matches].sort((a, b) => {
      const rareMarkersA = Object.entries(a.profile.markers)
        .filter(([marker]) => rareMarkers.has(marker))
        .length;
      
      const rareMarkersB = Object.entries(b.profile.markers)
        .filter(([marker]) => rareMarkers.has(marker))
        .length;

      return rareMarkersB - rareMarkersA;
    });
  }

  // Сортировка по географической близости
  static sortByGeographicProximity(
    matches: STRMatch[],
    targetCountry: string
  ): STRMatch[] {
    // Можно расширить с использованием геоданных для более точной сортировки
    return [...matches].sort((a, b) => {
      if (a.profile.country === targetCountry) return -1;
      if (b.profile.country === targetCountry) return 1;
      return (a.profile.country || '').localeCompare(b.profile.country || '');
    });
  }

  // Вспомогательный метод для сравнения версий
  static compareVersions(version1: string, version2: string): number {
    const parts1 = version1.split('.').map(Number);
    const parts2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }

  // Стабильная сортировка (сохраняет относительный порядок равных элементов)
  static stableSort<T>(
    array: T[],
    compareFn: (a: T, b: T) => number
  ): T[] {
    return array
      .map((item, index) => ({ item, index }))
      .sort((a, b) => compareFn(a.item, b.item) || a.index - b.index)
      .map(({ item }) => item);
  }
}

// Константы для часто используемых сортировок
export const SortOrders = {
  DEFAULT: { field: 'distance' as const, direction: 'asc' as const },
  GENETIC: { field: 'percentIdentical' as const, direction: 'desc' as const },
  ALPHABETICAL: { field: 'kitNumber' as const, direction: 'asc' as const },
  CHRONOLOGICAL: { field: 'timestamp' as const, direction: 'desc' as const }
} as const;

// Утилита для создания компараторов
export function createComparator<T>(
  getter: (item: T) => any,
  direction: SortDirection = 'asc'
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const valueA = getter(a);
    const valueB = getter(b);

    if (valueA === valueB) return 0;
    if (valueA === null || valueA === undefined) return 1;
    if (valueB === null || valueB === undefined) return -1;

    const comparison = 
      typeof valueA === 'string' && typeof valueB === 'string'
        ? valueA.localeCompare(valueB)
        : valueA < valueB ? -1 : 1;

    return direction === 'asc' ? comparison : -comparison;
  };
}