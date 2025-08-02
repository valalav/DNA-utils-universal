// src/hooks/useWorker.ts

import { useRef, useCallback, useEffect, useState } from 'react';
import { MarkerCount } from '@/utils/constants';
import type { STRProfile } from '@/utils/constants';
import type { CalculationMode } from '@/utils/calculations';

type WorkerStatus = 'idle' | 'processing' | 'error';

// ⚡ НОВЫЕ ТИПЫ для оптимизированного Worker API
interface OptimizedWorkerMessage {
  type: 'init' | 'processBatch' | 'finalize';
  query?: STRProfile;
  batch?: STRProfile[];
  markerCount?: MarkerCount;
  maxDistance?: number;
  maxMatches?: number;
  calculationMode?: CalculationMode;
  totalProfiles?: number;
  batchIndex?: number;
}

interface WorkerResult {
  profile: STRProfile;
  distance: number;
  comparedMarkers: number;
  identicalMarkers: number;
  percentIdentical: number;
  hasAllRequiredMarkers: boolean;
}

type OptimizedWorkerResponse = {
  type: 'complete';
  data: WorkerResult[];
} | {
  type: 'progress';
  progress: number;
  processed: number;
  found: number;
} | {
  type: 'batchComplete';
  results: WorkerResult[];
  processed: number;
} | {
  type: 'error';
  error: string;
};

// ⚡ ОБРАТНАЯ СОВМЕСТИМОСТЬ: Старый интерфейс для постепенного перехода
interface LegacyWorkerData {
  query: STRProfile;
  database: STRProfile[];
  markerCount: MarkerCount;
  maxDistance: number;
  maxMatches: number;
  calculationMode: CalculationMode;
}

export function useWorker() {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);
  // ⚡ ИСПРАВЛЕННАЯ ФУНКЦИЯ: Правильная архитектура с отдельными Promise для каждого вызова
  const execute = useCallback(async (message: OptimizedWorkerMessage): Promise<OptimizedWorkerResponse> => {
    return new Promise((resolve, reject) => {
      try {
        // ⚡ Создаем Worker если его нет
        if (!workerRef.current) {
          setLoading(true);
          setError(null);
          workerRef.current = new Worker(new URL('../workers/matchWorker.ts', import.meta.url), { type: 'module' });

          workerRef.current.onerror = (e) => {
            const error = new Error(`Worker error: ${e.message}`);
            setError(error);
            setLoading(false);
            reject(error);
            if (workerRef.current) {
              workerRef.current.terminate();
              workerRef.current = null;
            }
          };
        }

        // ⚡ ИСПРАВЛЕНИЕ: Создаем уникальный обработчик для каждого вызова с таймаутом
        let timeoutId: NodeJS.Timeout | null = null;
        const messageHandler = (e: MessageEvent<OptimizedWorkerResponse>) => {
          const response = e.data;

          // Очищаем таймаут при получении ответа
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          switch (response.type) {
            case 'complete':
              setLoading(false);
              workerRef.current?.removeEventListener('message', messageHandler);
              resolve(response);
              break;

            case 'progress':
              console.log(`🔄 Прогресс: ${response.progress}% (${response.processed}/${response.found})`);
              // НЕ resolve для progress - это промежуточное сообщение
              break;

            case 'batchComplete':
              console.log(`✅ Batch завершен: ${response.results.length} новых матчей`);
              workerRef.current?.removeEventListener('message', messageHandler);
              resolve(response);
              break;

            case 'error':
              const workerError = new Error(response.error);
              setError(workerError);
              setLoading(false);
              workerRef.current?.removeEventListener('message', messageHandler);
              reject(workerError);
              if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
              }
              break;
          }
        };

        // ⚡ Для init сообщений сразу resolve после отправки без обработчика
        if (message.type === 'init') {
          workerRef.current.postMessage(message);
          resolve({ type: 'progress', progress: 0, processed: 0, found: 0 });
          return;
        }

        // ⚡ Добавляем обработчик только для не-init сообщений
        workerRef.current.addEventListener('message', messageHandler);

        // ⚡ Добавляем таймаут для предотвращения зависших промисов
        timeoutId = setTimeout(() => {
          workerRef.current?.removeEventListener('message', messageHandler);
          const timeoutError = new Error('Worker timeout: no response received');
          setError(timeoutError);
          setLoading(false);
          reject(timeoutError);
        }, 30000); // 30 секунд таймаут

        // Отправляем сообщение в Worker
        workerRef.current.postMessage(message);

      } catch (error) {
        console.error('❌ Ошибка запуска worker:', error);
        setError(error instanceof Error ? error : new Error('Unknown error'));
        setLoading(false);
        reject(error);
      }
    });
  }, []);
  // ⚡ ОБРАТНАЯ СОВМЕСТИМОСТЬ: Старая функция execute для legacy кода
  const executeLegacy = useCallback(async (data: LegacyWorkerData): Promise<{ type: 'complete'; data: any[] }> => {
    console.warn('⚠️ Legacy API deprecated. Using main worker instead.');
    
    // Конвертируем legacy данные в новый формат
    try {
      // Инициализируем worker
      await execute({
        type: 'init',
        query: data.query,
        markerCount: data.markerCount,
        maxDistance: data.maxDistance,
        maxMatches: data.maxMatches,
        calculationMode: data.calculationMode,
        totalProfiles: data.database.length
      });

      // Обрабатываем данные батчами
      const BATCH_SIZE = 1000;
      const totalBatches = Math.ceil(data.database.length / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, data.database.length);
        const batch = data.database.slice(startIndex, endIndex);

        await execute({
          type: 'processBatch',
          batch,
          batchIndex
        });
      }

      // Финализируем результаты
      const finalResponse = await execute({ type: 'finalize' });
      
      if (finalResponse.type === 'complete') {
        return finalResponse;
      } else {
        throw new Error('Unexpected response type from worker');
      }
    } catch (error) {
      console.error('Error in legacy worker compatibility:', error);
      throw error;
    }
  }, [execute]);

  // ⚡ ФУНКЦИЯ ОЧИСТКИ: Terminate Worker when done
  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setLoading(false);
      console.log('🧹 Worker очищен');
    }
  }, []);

  return {
    execute, // ⚡ Новый оптимизированный API
    executeLegacy, // 🔄 Старый API для совместимости
    cleanup, // 🧹 Очистка ресурсов
    loading,
    error
  };
}