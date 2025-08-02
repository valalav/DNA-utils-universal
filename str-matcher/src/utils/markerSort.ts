import { markers, MarkerSortOrder } from './constants';
import { markerStabilityOrder } from './markerStability';

// ⚡ УЛУЧШЕННАЯ ЗАГЛУШКА для i18n до его реализации
const i18n = {
  t: (key: string, options?: any) => {
    if (typeof options === 'string') return options;
    if (options && typeof options === 'object' && 'default' in options) {
      return options.default || key;
    }
    return key;
  }
};

// Используем TypeScript импорт вместо JSON
const stabilityOrder = markerStabilityOrder;

// Получение порядка стабильности для маркера
function getMarkerStability(marker: string): number {
  return stabilityOrder[marker] || 999;
}

// Функция для получения маркеров в нужном порядке
export function getOrderedMarkers(order: MarkerSortOrder): string[] {
  if (order === 'default') {
    return markers;
  }
  
  return [...markers].sort((a, b) => {
    const orderA = getMarkerStability(a);
    const orderB = getMarkerStability(b);
    return orderA - orderB;
  });
}

export const sortOptions: {
  value: MarkerSortOrder;
  labelKey: string;
}[] = [
  { value: 'default', labelKey: 'sort.default' },
  { value: 'mutation_rate', labelKey: 'sort.mutation_rate' }
];