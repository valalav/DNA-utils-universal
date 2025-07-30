import { STRProfile, MarkerCount, markerGroups } from '../utils/constants';
import { calculateGeneticDistance, CalculationMode } from '../utils/calculations';

declare const self: Worker & typeof globalThis;

interface WorkerMessage {
  query: STRProfile;
  database: STRProfile[];
  markerCount: MarkerCount;
  maxDistance: number;
  maxMatches: number;
  calculationMode: CalculationMode;
}

interface WorkerResult {
  profile: STRProfile;
  distance: number;
  comparedMarkers: number;
  identicalMarkers: number;
  percentIdentical: number;
  hasAllRequiredMarkers: boolean;
}

type WorkerResponse = {
  type: 'complete';
  data: WorkerResult[];
} | {
  type: 'progress';
  progress: number;
} | {
  type: 'error';
  error: string;
};

self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { query, database, markerCount, maxDistance, maxMatches, calculationMode } = e.data;

  try {
    // Минимальное требуемое количество маркеров для каждой группы
    const minRequired = {
      12: 8,  // минимум 8 из 12 маркеров
      37: 25, // минимум 25 из 37 маркеров
      67: 25, // минимум 25 из 67 маркеров
      111: 35 // минимум 35 из 111 маркеров
    }[markerCount];

    const markersToCompare = markerGroups[markerCount];

    // Фильтруем профили у которых достаточно валидных маркеров
    const validProfiles = database.filter(profile => {
      if (profile.kitNumber === query.kitNumber) return false;

      const validMarkers = markersToCompare.filter(marker => {
        const value = profile.markers[marker]?.trim();
        return value && value.length > 0;
      });

      return validMarkers.length >= minRequired;
    });

    const results = validProfiles
      .map(profile => {
        const result = calculateGeneticDistance(
          query.markers,
          profile.markers,
          markerCount,
          calculationMode
        );

        if (!result.hasAllRequiredMarkers || result.distance > maxDistance) {
          return null;
        }

        return {
          profile,
          ...result
        };
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxMatches);

    // Отправляем прогресс
    self.postMessage({
      type: 'progress',
      progress: 100
    });

    // Отправляем результаты
    self.postMessage({
      type: 'complete',
      data: results
    });

  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error in worker'
    });
  }
};