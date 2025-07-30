import { useState, useEffect, useCallback } from 'react';
import type { STRProfile, STRMatch, HistoryItem, MarkerCount } from '@/utils/constants';
import type { CalculationMode } from '@/utils/calculations';
import { dbManager } from '@/utils/storage/indexedDB';
import { useWorker } from '@/hooks/useWorker';
import { markerOperations } from '@/utils/markerOperations';

const CALCULATION_MODE_KEY = 'str_matcher_calculation_mode';

export const useSTRMatcher = () => {
  // Состояния для данных
  const [database, setDatabase] = useState<STRProfile[]>([]);
  const [query, setQuery] = useState<STRProfile | null>(null);
  const [matches, setMatches] = useState<STRMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [kitNumber, setKitNumber] = useState('');
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Состояния для настроек поиска
  const [markerCount, setMarkerCount] = useState<MarkerCount>(37);
  const [maxDistance, setMaxDistance] = useState(25);
  const [maxMatches, setMaxMatches] = useState(200);
  const [markerSortOrder, setMarkerSortOrder] = useState<'default' | 'mutation_rate'>('mutation_rate');

  // Инициализируем calculationMode из localStorage
  const [calculationMode, setCalculationMode] = useState<CalculationMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CALCULATION_MODE_KEY);
      return saved ? JSON.parse(saved) : { type: 'standard' };
    }
    return { type: 'standard' };
  });

  // Сохраняем режим расчета при изменении
  useEffect(() => {
    localStorage.setItem(CALCULATION_MODE_KEY, JSON.stringify(calculationMode));
  }, [calculationMode]);

  const { execute: executeMatching } = useWorker();

  useEffect(() => {
    const loadSavedProfiles = async () => {
      try {
        await dbManager.init();
        const savedProfiles = await dbManager.getProfiles();
        if (savedProfiles.length > 0) {
          setDatabase(savedProfiles);
        }
      } catch (error) {
        console.error('Error loading saved profiles:', error);
        setError('Failed to load saved profiles');
      }
    };
    loadSavedProfiles();
  }, []);

  const handleFindMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!kitNumber || !database.length) return;
  
      const currentProfile = database.find(p => p.kitNumber === kitNumber);
      if (!currentProfile) return;
  
      console.log('Запуск сравнения с режимом:', calculationMode);
  
      setTimeout(() => {
        executeMatching({
          query: currentProfile,
          database: database.filter(p => p.kitNumber !== currentProfile.kitNumber),
          markerCount,
          maxDistance,
          maxMatches,
          calculationMode // Передаем режим расчета в воркер
        }).then(response => {
          if (response.type === 'complete') {
            setMatches(response.data);
          }
        }).catch(error => {
          setError(error instanceof Error ? error.message : 'Unknown error');
        }).finally(() => {
          setLoading(false);
        });
      }, 0);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
    }
  }, [kitNumber, database, markerCount, maxDistance, maxMatches, calculationMode, executeMatching]);

  // Обновляем функцию handleReset чтобы сбрасывать режим расчета
  const handleReset = useCallback(() => {
    setMaxDistance(25);
    setMaxMatches(200);
    setMarkerCount(37);
    setMarkerSortOrder('mutation_rate');
    setCalculationMode({ type: 'standard' }); // Сбрасываем режим расчета
    setQuery(null); // Очищаем query
    setMatches([]); // Очищаем matches
    markerOperations.resetMarkers(); // Очищаем маркеры в интерфейсе
  }, []);

  return {
    database,
    setDatabase,
    query,
    setQuery,
    matches,
    setMatches,
    loading,
    setLoading,
    kitNumber,
    setKitNumber,
    searchHistory,
    setSearchHistory,
    error,
    setError,
    markerCount,
    setMarkerCount,
    maxDistance,
    setMaxDistance,
    maxMatches,
    setMaxMatches,
    markerSortOrder,
    setMarkerSortOrder,
    handleFindMatches,
    calculationMode,
    setCalculationMode,
    handleReset
  };
}; 