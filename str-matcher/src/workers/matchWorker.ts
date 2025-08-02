import { STRProfile, MarkerCount, markerGroups } from '../utils/constants';
import { calculateGeneticDistance, CalculationMode } from '../utils/calculations';

declare const self: Worker & typeof globalThis;

// ⚡ НОВАЯ АРХИТЕКТУРА: Worker НЕ получает весь массив!
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

// ⚡ СОСТОЯНИЕ WORKER'а для накопления результатов
let globalQuery: STRProfile | null = null;
let globalParams: {
  markerCount: MarkerCount;
  maxDistance: number;
  maxMatches: number;
  calculationMode: CalculationMode;
  totalProfiles: number;
} | null = null;

let accumulatedResults: WorkerResult[] = [];
let processedCount = 0;
// ⚡ БЫСТРАЯ ПРЕДВАРИТЕЛЬНАЯ ФИЛЬТРАЦИЯ
function quickFilter(profile: STRProfile, query: STRProfile, markerCount: MarkerCount): boolean {
  // Исключаем сам профиль
  if (profile.kitNumber === query.kitNumber) return false;

  const markersToCompare = markerGroups[markerCount];
  const minRequired = {
    12: 8,   // минимум 8 из 12 маркеров
    37: 25,  // минимум 25 из 37 маркеров  
    67: 45,  // минимум 45 из 67 маркеров
    111: 75  // минимум 75 из 111 маркеров
  }[markerCount];

  // ⚡ Быстрый подсчет валидных маркеров
  let validCount = 0;
  for (const marker of markersToCompare) {
    const value = profile.markers[marker]?.trim();
    if (value && value.length > 0) {
      validCount++;
      // ⚡ Ранний выход если уже достаточно
      if (validCount >= minRequired) return true;
    }
  }

  return false;
}

// ⚡ АСИНХРОННАЯ ОБРАБОТКА БАТЧА с прогрессом
async function processBatch(
  batch: STRProfile[], 
  batchIndex: number
): Promise<WorkerResult[]> {
  if (!globalQuery || !globalParams) {
    throw new Error('Worker не инициализирован');
  }

  const { markerCount, maxDistance, calculationMode } = globalParams;
  const batchResults: WorkerResult[] = [];

  // ⚡ Обрабатываем профили в батче с микро-паузами
  for (let i = 0; i < batch.length; i++) {
    const profile = batch[i];
    
    // ⚡ Быстрая предварительная фильтрация
    if (!quickFilter(profile, globalQuery, markerCount)) {
      continue;
    } else {
      processedCount++;
    }

    // ⚡ Точный расчет генетической дистанции
    const result = calculateGeneticDistance(
      globalQuery.markers,
      profile.markers,
      markerCount,
      calculationMode
    );

    if (result.hasAllRequiredMarkers && result.distance <= maxDistance) {
      batchResults.push({
        profile,
        ...result
      });
    }

    processedCount++;

    // ⚡ Микро-пауза каждые 100 профилей чтобы не блокировать Worker
    if (i % 100 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Отправляем промежуточный прогресс
      self.postMessage({
        type: 'progress',
        progress: Math.floor((processedCount / globalParams.totalProfiles) * 100),
        processed: processedCount,
        found: accumulatedResults.length + batchResults.length
      });
    }
  }

  return batchResults;
}
// ⚡ ОСНОВНОЙ ОБРАБОТЧИК СООБЩЕНИЙ
self.onmessage = async function(e: MessageEvent<OptimizedWorkerMessage>) {
  try {
    const message = e.data;

    switch (message.type) {
      case 'init':
        // ⚡ Инициализация Worker'а без получения данных
        if (!message.query || !message.markerCount || message.maxDistance === undefined || 
            !message.maxMatches || !message.calculationMode || !message.totalProfiles) {
          throw new Error('Недостаточно параметров для инициализации');
        }

        globalQuery = message.query;
        globalParams = {
          markerCount: message.markerCount,
          maxDistance: message.maxDistance,
          maxMatches: message.maxMatches,
          calculationMode: message.calculationMode,
          totalProfiles: message.totalProfiles
        };
        
        // Сбрасываем состояние
        accumulatedResults = [];
        processedCount = 0;

        console.log(`🚀 Worker инициализирован для обработки ${message.totalProfiles} профилей`);
        
        self.postMessage({
          type: 'progress',
          progress: 0,
          processed: 0,
          found: 0
        });
        break;

      case 'processBatch':
        // ⚡ Обработка батча профилей
        if (!message.batch || message.batchIndex === undefined) {
          throw new Error('Нет данных батча для обработки');
        }

        const batchResults = await processBatch(message.batch, message.batchIndex);
        
        // ⚡ Добавляем результаты к общему массиву
        accumulatedResults.push(...batchResults);

        // Отправляем результаты батча
        self.postMessage({
          type: 'batchComplete',
          results: batchResults,
          processed: processedCount
        });
        break;

      case 'finalize':
        // ⚡ Финализация: сортировка и ограничение результатов
        if (!globalParams) {
          throw new Error('Worker не инициализирован');
        }

        // ⚡ Сортируем по дистанции и ограничиваем количество
        const finalResults = accumulatedResults
          .sort((a, b) => a.distance - b.distance)
          .slice(0, globalParams.maxMatches);

        console.log(`🎉 Обработка завершена: найдено ${finalResults.length} матчей из ${processedCount} профилей`);

        // Отправляем финальные результаты
        self.postMessage({
          type: 'complete',
          data: finalResults
        });

        // Очищаем состояние
        globalQuery = null;
        globalParams = null;
        accumulatedResults = [];
        processedCount = 0;
        
        // Принудительная очистка памяти
        if (typeof global !== 'undefined' && global.gc) {
          global.gc();
        }
        break;

      default:
        throw new Error(`Неизвестный тип сообщения: ${(message as any).type}`);
    }

  } catch (error) {
    console.error('❌ Ошибка в Worker:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error in worker'
    });
  }
};