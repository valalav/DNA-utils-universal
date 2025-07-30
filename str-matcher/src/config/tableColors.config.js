// Table Color Configuration
// Единое место для управления всеми цветами таблицы совпадений

export const tableColors = {
  // Цвета фона для редкости маркеров
  markerRarity: {
    common: '#fef3f2',        // Очень светлый для частых (20-33%)
    uncommon: '#fed7cc',      // Светлый для необычных (12-20%)
    rare: '#fb9b7a',          // Средний для редких (8-12%)
    veryRare: '#f97316',      // Темный для очень редких (4-8%)
    extremelyRare: '#dc2626', // Очень темный для экстремально редких (<4%)
  },
  
  // Цвета текста для различий
  textDifference: {
    diff1: '#3b82f6',  // Светло-синий для разницы в 1
    diff2: '#2563eb',  // Синий для разницы в 2
    diff3: '#1d4ed8',  // Темно-синий для разницы в 3+
  },
  
  // Цвета границ
  borders: {
    default: '#000000',    // Черный цвет для всех границ
    light: '#e5e7eb',      // Светлый (если понадобится)
  },
  
  // Отступы для цветных блоков внутри ячеек
  cellPadding: {
    vertical: '2px',   // Отступ сверху и снизу для цветного блока
    horizontal: '0px', // Отступ слева и справа
  }
};

// Функция для генерации CSS переменных
export const generateCSSVariables = () => {
  const cssVars = [];
  
  // Маркеры редкости
  Object.entries(tableColors.markerRarity).forEach(([key, value]) => {
    cssVars.push(`--marker-rarity-${key.toLowerCase()}: ${value};`);
  });
  
  // Цвета различий
  Object.entries(tableColors.textDifference).forEach(([key, value]) => {
    cssVars.push(`--text-${key.toLowerCase()}: ${value};`);
  });
  
  // Границы
  Object.entries(tableColors.borders).forEach(([key, value]) => {
    cssVars.push(`--border-${key.toLowerCase()}: ${value};`);
  });
  
  // Отступы
  cssVars.push(`--cell-padding-vertical: ${tableColors.cellPadding.vertical};`);
  cssVars.push(`--cell-padding-horizontal: ${tableColors.cellPadding.horizontal};`);
  
  return cssVars.join('\n  ');
};
