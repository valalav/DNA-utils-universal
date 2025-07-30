import { markers, MarkerSortOrder } from './constants';
import stabilityOrderData from './markerStability.json';
import { i18n } from './i18n';

const stabilityOrder = stabilityOrderData as Record<string, number>;

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