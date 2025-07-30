import { STRMatch, STRProfile } from './constants';
import { calculateMarkerDifference } from './calculations';
import { logger } from './logger';
import { metricsCollector } from './metrics';

interface MarkerStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  frequencies: Record<string, number>;
}

interface HaplogroupStats {
  count: number;
  percentage: number;
  subgroups: Record<string, number>;
  commonMarkers: Record<string, string>;
}

interface GeographicStats {
  countryCounts: Record<string, number>;
  regionCounts: Record<string, number>;
  topCountries: Array<{ country: string; count: number }>;
}

export class Analytics {
  // Анализ маркеров
  static analyzeMarkers(profiles: STRProfile[]): Record<string, MarkerStats> {
    const results: Record<string, MarkerStats> = {};

    try {
      profiles.forEach(profile => {
        Object.entries(profile.markers).forEach(([marker, value]) => {
          if (!results[marker]) {
            results[marker] = this.initMarkerStats();
          }

          const numValue = parseInt(value);
          if (!isNaN(numValue)) {
            const stats = results[marker];
            stats.count++;
            stats.min = Math.min(stats.min, numValue);
            stats.max = Math.max(stats.max, numValue);
            stats.frequencies[value] = (stats.frequencies[value] || 0) + 1;
          }
        });
      });

      // Вычисляем дополнительные статистики
      Object.values(results).forEach(stats => {
        if (stats.count > 0) {
          const values = Object.entries(stats.frequencies)
            .map(([value, count]) => ({ value: parseInt(value), count }));

          stats.mean = this.calculateMean(values);
          stats.median = this.calculateMedian(values);
          stats.mode = this.calculateMode(values);
          stats.stdDev = this.calculateStdDev(values, stats.mean);
        }
      });

      logger.debug('Marker analysis completed', { markerCount: Object.keys(results).length });
      return results;

    } catch (error) {
      logger.error('Error in marker analysis', error as Error);
      throw error;
    }
  }

  // Анализ генетических дистанций
  static analyzeGeneticDistances(matches: STRMatch[]): {
    distribution: Record<number, number>;
    stats: {
      mean: number;
      median: number;
      mode: number;
      stdDev: number;
    };
  } {
    const distribution: Record<number, number> = {};
    const distances = matches.map(m => m.distance);

    distances.forEach(distance => {
      distribution[distance] = (distribution[distance] || 0) + 1;
    });

    return {
      distribution,
      stats: {
        mean: this.calculateSimpleMean(distances),
        median: this.calculateSimpleMedian(distances),
        mode: this.calculateSimpleMode(distances),
        stdDev: this.calculateSimpleStdDev(distances)
      }
    };
  }

  // Анализ гаплогрупп
  static analyzeHaplogroups(matches: STRMatch[]): Record<string, HaplogroupStats> {
    const results: Record<string, HaplogroupStats> = {};
    const totalMatches = matches.length;

    matches.forEach(match => {
      const haplogroup = match.profile.haplogroup;
      if (!haplogroup) return;

      // Разбиваем гаплогруппу на подгруппы
      const subgroups = this.getHaplogroupSubgroups(haplogroup);
      
      subgroups.forEach(subgroup => {
        if (!results[subgroup]) {
          results[subgroup] = {
            count: 0,
            percentage: 0,
            subgroups: {},
            commonMarkers: {}
          };
        }

        results[subgroup].count++;
        results[subgroup].percentage = (results[subgroup].count / totalMatches) * 100;

        // Анализируем маркеры для каждой гаплогруппы
        Object.entries(match.profile.markers).forEach(([marker, value]) => {
          if (!results[subgroup].commonMarkers[marker]) {
            results[subgroup].commonMarkers[marker] = value;
          }
        });
      });
    });

    return results;
  }

  // Географический анализ
  static analyzeGeography(matches: STRMatch[]): GeographicStats {
    const countryCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};

    matches.forEach(match => {
      const country = match.profile.country;
      if (country) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
        
        const region = this.getRegionForCountry(country);
        if (region) {
          regionCounts[region] = (regionCounts[region] || 0) + 1;
        }
      }
    });

    const topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      countryCounts,
      regionCounts,
      topCountries
    };
  }

  // Анализ редких маркеров
  static analyzeRareMarkers(matches: STRMatch[]): {
    rareValues: Record<string, Array<{ value: string; frequency: number }>>;
    uniqueCombinations: Array<{ markers: Record<string, string>; count: number }>;
  } {
    const markerValueCounts: Record<string, Record<string, number>> = {};
    const combinationCounts = new Map<string, number>();

    // Подсчет частот значений маркеров
    matches.forEach(match => {
      Object.entries(match.profile.markers).forEach(([marker, value]) => {
        if (!markerValueCounts[marker]) {
          markerValueCounts[marker] = {};
        }
        markerValueCounts[marker][value] = (markerValueCounts[marker][value] || 0) + 1;
      });

      // Анализ комбинаций маркеров
      const markerKey = JSON.stringify(match.profile.markers);
      combinationCounts.set(markerKey, (combinationCounts.get(markerKey) || 0) + 1);
    });

    // Определение редких значений
    const rareValues: Record<string, Array<{ value: string; frequency: number }>> = {};
    const totalMatches = matches.length;

    Object.entries(markerValueCounts).forEach(([marker, valueCounts]) => {
      rareValues[marker] = Object.entries(valueCounts)
        .map(([value, count]) => ({
          value,
          frequency: (count / totalMatches) * 100
        }))
        .filter(({ frequency }) => frequency < 5)
        .sort((a, b) => a.frequency - b.frequency);
    });

    // Определение уникальных комбинаций
    const uniqueCombinations = Array.from(combinationCounts.entries())
      .map(([markersJson, count]) => ({
        markers: JSON.parse(markersJson),
        count
      }))
      .filter(({ count }) => count === 1)
      .sort((a, b) => Object.keys(b.markers).length - Object.keys(a.markers).length);

    return {
      rareValues,
      uniqueCombinations
    };
  }

  // Вспомогательные методы
  private static initMarkerStats(): MarkerStats {
    return {
      count: 0,
      min: Infinity,
      max: -Infinity,
      mean: 0,
      median: 0,
      mode: 0,
      stdDev: 0,
      frequencies: {}
    };
  }

  private static calculateMean(values: Array<{ value: number; count: number }>): number {
    const sum = values.reduce((acc, { value, count }) => acc + value * count, 0);
    const count = values.reduce((acc, { count }) => acc + count, 0);
    return sum / count;
  }

  private static calculateMedian(values: Array<{ value: number; count: number }>): number {
    const sorted = values.flatMap(({ value, count }) => Array(count).fill(value)).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private static calculateMode(values: Array<{ value: number; count: number }>): number {
    return values.reduce((a, b) => a.count > b.count ? a : b).value;
  }

  private static calculateStdDev(values: Array<{ value: number; count: number }>, mean: number): number {
    const totalCount = values.reduce((acc, { count }) => acc + count, 0);
    const variance = values.reduce((acc, { value, count }) => {
      const diff = value - mean;
      return acc + (diff * diff * count);
    }, 0) / totalCount;
    return Math.sqrt(variance);
  }

  private static getHaplogroupSubgroups(haplogroup: string): string[] {
    const subgroups = [];
    let current = '';
    for (const char of haplogroup) {
      current += char;
      subgroups.push(current);
    }
    return subgroups;
  }

  private static getRegionForCountry(country: string): string | null {
    // Здесь можно добавить mapping стран по регионам
    const regionMap: Record<string, string> = {
      'USA': 'North America',
      'Canada': 'North America',
      'UK': 'Europe',
      'Germany': 'Europe',
      // Добавить другие страны...
    };
    return regionMap[country] || null;
  }

  // Вспомогательные методы для простых вычислений
  private static calculateSimpleMean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private static calculateSimpleMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private static calculateSimpleMode(values: number[]): number {
    const counts = values.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    return Number(Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0]);
  }

  private static calculateSimpleStdDev(values: number[]): number {
    const mean = this.calculateSimpleMean(values);
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}
