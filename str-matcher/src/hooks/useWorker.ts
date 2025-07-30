// src/hooks/useWorker.ts

import { useRef, useCallback, useEffect, useState } from 'react';
import { MarkerCount } from '@/utils/constants';
import type { STRProfile, STRMatch } from '@/utils/constants';
import type { CalculationMode } from '@/utils/calculations';

type WorkerStatus = 'idle' | 'processing' | 'error';

interface WorkerData {
  query: STRProfile;
  database: STRProfile[];
  markerCount: MarkerCount;
  maxDistance: number;
  maxMatches: number;
  calculationMode: CalculationMode;
}

interface WorkerResult {
  type: 'complete';
  data: any[];
}

export function useWorker() {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const execute = useCallback(async (data: WorkerData): Promise<WorkerResult> => {
    return new Promise((resolve, reject) => {
      try {
        setLoading(true);
        setError(null);

        // Create new worker using Next.js worker syntax
        workerRef.current = new Worker(new URL('../workers/comparison.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e: MessageEvent) => {
          const response = e.data;

          switch (response.type) {
            case 'complete':
              setLoading(false);
              resolve(response);
              if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
              }
              break;

            case 'progress':
              console.log(`Прогресс сравнения: ${response.progress.toFixed(1)}%`);
              break;

            case 'error':
              const workerError = new Error(response.error);
              setError(workerError);
              setLoading(false);
              reject(workerError);
              if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
              }
              break;
          }
        };

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

        console.log('Запуск сравнения...', {
          queryKit: data.query.kitNumber,
          dbSize: data.database.length,
          markerCount: data.markerCount
        });

        workerRef.current.postMessage(data);

      } catch (error) {
        console.error('Ошибка запуска worker:', error);
        setError(error instanceof Error ? error : new Error('Unknown error'));
        setLoading(false);
        reject(error);
      }
    });
  }, []);

  return {
    execute,
    loading,
    error
  };
}