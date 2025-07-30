import { STRMatch, STRProfile } from './constants';
import { calculateMarkerDifference } from './calculations';
import { normalizeString } from './formatters';

type FilterOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith';

interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

interface FilterOptions {
  caseSensitive?: boolean;
  trimValues?: boolean;
  nullHandling?: 'include' | 'exclude' | 'first' | 'last';
}

export class Filters {
  // Основной метод фильтрации матчей
  static filterMatches(
    matches: STRMatch[],
    conditions: FilterCondition[],
    options: FilterOptions = {}
  ): STRMatch[] {
    const {
      caseSensitive = false,
      trimValues = true,
      nullHandling = 'exclude'
    } = options;

    return matches.filter(match => {
      return conditions.every(condition => {
        const value = this.getFieldValue(match, condition.field);
        
        if (value === null || value === undefined) {
          return nullHandling === 'include';
        }

        return this.evaluateCondition(value, condition, { caseSensitive, trimValues });
      });
    });
  }

  // Фильтр по генетической дистанции
  static filterByGeneticDistance(
    matches: STRMatch[],
    maxDistance: number
  ): STRMatch[] {
    return matches.filter(match => match.distance <= maxDistance);
  }

  // Фильтр по проценту совпадений
  static filterByPercentIdentical(
    matches: STRMatch[],
    minPercent: number
  ): STRMatch[] {
    return matches.filter(match => match.percentIdentical >= minPercent);
  }

  // Фильтр по конкретным маркерам
  static filterByMarkers(
    matches: STRMatch[],
    markerConditions: Record<string, string>
  ): STRMatch[] {
    return matches.filter(match => {
      return Object.entries(markerConditions).every(([marker, value]) => {
        const markerValue = match.profile.markers[marker];
        if (!markerValue) return false;
        
        const diff = calculateMarkerDifference(value, markerValue, marker);
        return diff === 0;
      });
    });
  }

  // Фильтр по гаплогруппе
  static filterByHaplogroup(
    matches: STRMatch[],
    haplogroup: string,
    includeSubgroups: boolean = true
  ): STRMatch[] {
    return matches.filter(match => {
      if (!match.profile.haplogroup) return false;
      
      if (includeSubgroups) {
        return match.profile.haplogroup.startsWith(haplogroup);
      }
      return match.profile.haplogroup === haplogroup;
    });
  }

  // Фильтр по странам
  static filterByCountries(
    matches: STRMatch[],
    countries: string[]
  ): STRMatch[] {
    const normalizedCountries = countries.map(c => normalizeString(c));
    return matches.filter(match => {
      if (!match.profile.country) return false;
      return normalizedCountries.includes(normalizeString(match.profile.country));
    });
  }

  // Фильтр по качеству совпадений
  static filterByQuality(
    matches: STRMatch[],
    minComparedMarkers: number
  ): STRMatch[] {
    return matches.filter(match => 
      match.comparedMarkers >= minComparedMarkers
    );
  }

  // Поиск по тексту во всех полях
  static searchText(
    matches: STRMatch[],
    searchText: string,
    fields?: (keyof STRProfile)[]
  ): STRMatch[] {
    const normalizedSearch = normalizeString(searchText);
    
    return matches.filter(match => {
      const searchFields = fields || ['kitNumber', 'name', 'country', 'haplogroup'];
      
      return searchFields.some(field => {
        const value = match.profile[field];
        if (!value) return false;
        return normalizeString(String(value)).includes(normalizedSearch);
      });
    });
  }

  // Комплексный фильтр с множеством условий
  static complexFilter(
    matches: STRMatch[],
    conditions: {
      maxDistance?: number;
      minPercentIdentical?: number;
      haplogroup?: string;
      countries?: string[];
      minComparedMarkers?: number;
      markerConditions?: Record<string, string>;
      searchText?: string;
    }
  ): STRMatch[] {
    let filtered = [...matches];

    if (conditions.maxDistance !== undefined) {
      filtered = this.filterByGeneticDistance(filtered, conditions.maxDistance);
    }

    if (conditions.minPercentIdentical !== undefined) {
      filtered = this.filterByPercentIdentical(filtered, conditions.minPercentIdentical);
    }

    if (conditions.haplogroup) {
      filtered = this.filterByHaplogroup(filtered, conditions.haplogroup);
    }

    if (conditions.countries?.length) {
      filtered = this.filterByCountries(filtered, conditions.countries);
    }

    if (conditions.minComparedMarkers !== undefined) {
      filtered = this.filterByQuality(filtered, conditions.minComparedMarkers);
    }

    if (conditions.markerConditions) {
      filtered = this.filterByMarkers(filtered, conditions.markerConditions);
    }

    if (conditions.searchText) {
      filtered = this.searchText(filtered, conditions.searchText);
    }

    return filtered;
  }

  // Приватные вспомогательные методы
  private static getFieldValue(obj: any, field: string): any {
    const parts = field.split('.');
    return parts.reduce((value, part) => (value ? value[part] : null), obj);
  }

  private static evaluateCondition(
    value: any,
    condition: FilterCondition,
    options: { caseSensitive: boolean; trimValues: boolean }
  ): boolean {
    const { operator, value: targetValue } = condition;
    const { caseSensitive, trimValues } = options;

    // Подготовка значений для сравнения
    let actualValue = value;
    let compareValue = targetValue;

    if (typeof value === 'string') {
      actualValue = trimValues ? value.trim() : value;
      if (!caseSensitive) {
        actualValue = actualValue.toLowerCase();
        compareValue = String(compareValue).toLowerCase();
      }
    }

    switch (operator) {
      case 'eq':
        return actualValue === compareValue;
      case 'ne':
        return actualValue !== compareValue;
      case 'gt':
        return actualValue > compareValue;
      case 'lt':
        return actualValue < compareValue;
      case 'gte':
        return actualValue >= compareValue;
      case 'lte':
        return actualValue <= compareValue;
      case 'contains':
        return String(actualValue).includes(String(compareValue));
      case 'startsWith':
        return String(actualValue).startsWith(String(compareValue));
      case 'endsWith':
        return String(actualValue).endsWith(String(compareValue));
      default:
        return false;
    }
  }
}

// Предопределенные фильтры для частых случаев
export const CommonFilters = {
  CLOSE_MATCHES: {
    maxDistance: 3,
    minPercentIdentical: 90
  },
  EXACT_MATCHES: {
    maxDistance: 0,
    minPercentIdentical: 100
  },
  QUALITY_MATCHES: {
    minComparedMarkers: 25,
    minPercentIdentical: 85
  }
} as const;
