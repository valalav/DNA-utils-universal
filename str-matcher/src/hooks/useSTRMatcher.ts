import { useState, useEffect, useCallback } from 'react';
import type { STRProfile, STRMatch, HistoryItem, MarkerCount } from '@/utils/constants';
import type { CalculationMode } from '@/utils/calculations';
import { useWorker } from '@/hooks/useWorker';
import { markerOperations } from '@/utils/markerOperations';

const CALCULATION_MODE_KEY = 'str_matcher_calculation_mode';

// 🔄 УТИЛИТА: Объединение профилей без дублей (последний загруженный побеждает)
const mergeProfiles = (existingProfiles: STRProfile[], newProfiles: STRProfile[]): STRProfile[] => {
  const profileMap = new Map<string, STRProfile>();
  
  // Сначала добавляем существующие профили
  existingProfiles.forEach(profile => {
    if (profile.kitNumber) {
      profileMap.set(profile.kitNumber, profile);
    }
  });
  
  // Затем добавляем новые (перезаписывая дубли - последний загруженный побеждает)
  newProfiles.forEach(profile => {
    if (profile.kitNumber) {
      profileMap.set(profile.kitNumber, profile);
    }
  });
  
  const mergedProfiles = Array.from(profileMap.values());
  console.log(`🔄 Объединено профилей: ${existingProfiles.length} + ${newProfiles.length} = ${mergedProfiles.length} (исключено дублей: ${existingProfiles.length + newProfiles.length - mergedProfiles.length})`);
  
  return mergedProfiles;
};

export const useSTRMatcher = () => {
  // 🔄 УПРОЩЕНИЕ: Простое хранение базы в памяти
  const [database, setDatabase] = useState<STRProfile[]>([]);
  
  const [query, setQuery] = useState<STRProfile | null>(null);
  const [matches, setMatches] = useState<STRMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [kitNumber, setKitNumber] = useState('');
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ⚡ СОСТОЯНИЯ для детального прогресса (сохраняем для UI)
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

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

  // 🔄 УПРОЩЕННАЯ ЛОГИКА ПОИСКА: Работаем с массивом в памяти
  const handleFindMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProcessingProgress(0);
    setProcessedCount(0);
    setFoundCount(0);
    setCurrentBatch(0);
    
    try {
      if (!kitNumber) {
        setError('Введите номер кита для поиска');
        return;
      }

      if (database.length === 0) {
        setError('База данных пуста. Загрузите CSV файл.');
        return;
      }
  
      // 🔄 УПРОЩЕНИЕ: Ищем профиль в массиве, а не в IndexedDB
      const currentProfile = database.find(profile => profile.kitNumber === kitNumber);
      if (!currentProfile) {
        setError(`Профиль с номером ${kitNumber} не найден в базе`);
        return;
      }

      setQuery(currentProfile);
      console.log(`🎯 Найден профиль ${kitNumber}, начинаем поиск среди ${database.length} профилей`);
  
      // ⚡ Инициализируем Worker для обработки массива
      await initializeWorkerForSearch(currentProfile);
      
      // ⚡ Запускаем обработку батчами из массива
      await processProfilesInBatches();
      
    } catch (error) {
      console.error('❌ Ошибка поиска:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [kitNumber, database, markerCount, maxDistance, maxMatches, calculationMode, executeMatching]);

  // ⚡ ИНИЦИАЛИЗАЦИЯ WORKER'а
  const initializeWorkerForSearch = async (queryProfile: STRProfile): Promise<void> => {
    try {
      await executeMatching({
        type: 'init',
        query: queryProfile,
        markerCount,
        maxDistance,
        maxMatches,
        calculationMode,
        totalProfiles: database.length
      });
      
      console.log('🚀 Worker инициализирован для обработки массива');
    } catch (error) {
      throw new Error(`Ошибка инициализации Worker: ${error}`);
    }
  };

  // ⚡ ОБРАБОТКА БАТЧАМИ: Разбиваем массив на части и отправляем в Worker
  const processProfilesInBatches = async (): Promise<void> => {
    const BATCH_SIZE = 1000; // Обрабатываем по 1000 профилей
    const totalBatches = Math.ceil(database.length / BATCH_SIZE);
    setTotalBatches(totalBatches);

    return new Promise(async (resolve, reject) => {
      try {
        // Обрабатываем каждый батч
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startIndex = batchIndex * BATCH_SIZE;
          const endIndex = Math.min(startIndex + BATCH_SIZE, database.length);
          const batch = database.slice(startIndex, endIndex);

          console.log(`📦 Обрабатываю batch ${batchIndex + 1}/${totalBatches} (${batch.length} профилей)`);
          setCurrentBatch(batchIndex + 1);
          
          // ⚡ Отправляем батч в Worker
          const response = await executeMatching({
            type: 'processBatch',
            batch,
            batchIndex
          });

          // ⚡ Обрабатываем ответ Worker'а
          if (response.type === 'batchComplete') {
            setProcessedCount(response.processed);
            console.log(`✅ Batch ${batchIndex + 1} обработан: ${response.results.length} новых матчей`);
          } else if (response.type === 'progress') {
            setProcessingProgress(response.progress);
            setProcessedCount(response.processed);
            setFoundCount(response.found);
          }
        }

        // ⚡ Все батчи обработаны, финализируем результаты
        console.log(`🎯 Все ${totalBatches} батчей обработаны, финализируем результаты`);
        
        const finalResponse = await executeMatching({ type: 'finalize' });
        
        if (finalResponse.type === 'complete') {
          setMatches(finalResponse.data);
          setProcessingProgress(100);
          console.log(`🎉 Поиск завершен: найдено ${finalResponse.data.length} матчей`);
        }
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  // Обновляем функцию handleReset
  const handleReset = useCallback(() => {
    setMaxDistance(25);
    setMaxMatches(200);
    setMarkerCount(37);
    setMarkerSortOrder('mutation_rate');
    setCalculationMode({ type: 'standard' });
    setQuery(null);
    setMatches([]);
    setProcessingProgress(0);
    setProcessedCount(0);
    setFoundCount(0);
    setCurrentBatch(0);
    setTotalBatches(0);
    markerOperations.resetMarkers();
  }, []);

  // 🔄 НОВАЯ ФУНКЦИЯ: Накопительное добавление профилей без дублей
  const mergeDatabase = useCallback((newProfiles: STRProfile[]) => {
    setDatabase(prevDatabase => {
      const merged = mergeProfiles(prevDatabase, newProfiles);
      console.log(`🔄 База обновлена: было ${prevDatabase.length}, добавлено ${newProfiles.length}, стало ${merged.length}`);
      return merged;
    });
  }, []);

  return {
    // 🔄 УПРОЩЕННЫЕ ДАННЫЕ
    database,
    setDatabase,
    mergeDatabase, // 🔄 НОВАЯ ФУНКЦИЯ для накопительной загрузки
    totalProfiles: database.length, // Простое вычисление из массива
    
    // ⚡ СОСТОЯНИЯ ПРОГРЕССА
    processingProgress,
    processedCount,
    foundCount,
    currentBatch,
    totalBatches,
    
    // Существующие состояния
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
    handleFindMatches, // ⚡ Упрощенная функция
    calculationMode,
    setCalculationMode,
    handleReset // ⚡ Обновленная функция
  };
};