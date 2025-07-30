export function formatMarkerValue(marker: string, value: string): string {
  // Форматирование значений маркеров
  return value.trim();
}

export const markerInfo: Record<string, { minValue?: number; maxValue?: number }> = {
  DYS393: { minValue: 9, maxValue: 17 },
  DYS390: { minValue: 17, maxValue: 28 },
  DYS19: { minValue: 10, maxValue: 19 },
  DYS391: { minValue: 6, maxValue: 14 },
  DYS385: { minValue: 7, maxValue: 28 }
}; 