// Утилиты для работы с цветами
export type ColorMode = 'light' | 'dark' | 'system';
export type ColorDensity = 'compact' | 'comfortable' | 'spacious';

interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: {
    light: string;
    medium: string;
  };
  states: {
    success: string;
    warning: string;
    error: string;
  };
  markers: {
    diff: {
      one: string;
      two: string;
      three: string;
    };
    rarity: {
      one: string;
      two: string;
      three: string;
      four: string;
      five: string;
    };
  };
}

// Определение цветовых схем
export const lightTheme: ColorScheme = {
  primary: '#2C5282',
  secondary: '#4A5568',
  accent: '#5A67D8',
  background: {
    primary: '#FFFFFF',
    secondary: '#F7FAFC',
    tertiary: '#EDF2F7',
  },
  text: {
    primary: '#2D3748',
    secondary: '#4A5568',
    muted: '#718096',
  },
  border: {
    light: '#E2E8F0',
    medium: '#CBD5E0',
  },
  states: {
    success: '#38A169',
    warning: '#D69E2E',
    error: '#E53E3E',
  },
  markers: {
    diff: {
      one: '#4299E1',
      two: '#2B6CB0',
      three: '#2A4365',
    },
    rarity: {
      one: '#2C5282',
      two: '#3182CE',
      three: '#4299E1',
      four: '#63B3ED',
      five: '#90CDF4',
    },
  },
};

export const darkTheme: ColorScheme = {
  primary: '#4299E1',
  secondary: '#A0AEC0',
  accent: '#6B7FD7',
  background: {
    primary: '#1A202C',
    secondary: '#2D3748',
    tertiary: '#4A5568',
  },
  text: {
    primary: '#F7FAFC',
    secondary: '#E2E8F0',
    muted: '#A0AEC0',
  },
  border: {
    light: '#4A5568',
    medium: '#2D3748',
  },
  states: {
    success: '#48BB78',
    warning: '#ECC94B',
    error: '#F56565',
  },
  markers: {
    diff: {
      one: '#63B3ED',
      two: '#4299E1',
      three: '#3182CE',
    },
    rarity: {
      one: '#4299E1',
      two: '#63B3ED',
      three: '#90CDF4',
      four: '#BEE3F8',
      five: '#EBF8FF',
    },
  },
};

// Функции для работы с цветами
export function getColorScheme(mode: ColorMode): ColorScheme {
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? darkTheme : lightTheme;
  }
  return mode === 'dark' ? darkTheme : lightTheme;
}

export function getRarityColor(percentage: number, isDark: boolean = false): string {
  const theme = isDark ? darkTheme : lightTheme;
  if (percentage <= 4) return theme.markers.rarity.one;
  if (percentage <= 8) return theme.markers.rarity.two;
  if (percentage <= 12) return theme.markers.rarity.three;
  if (percentage <= 20) return theme.markers.rarity.four;
  if (percentage <= 33) return theme.markers.rarity.five;
  return 'transparent';
}

export function getDiffColor(diff: number, isDark: boolean = false): string {
  const theme = isDark ? darkTheme : lightTheme;
  if (diff === 1) return theme.markers.diff.one;
  if (diff === 2) return theme.markers.diff.two;
  return theme.markers.diff.three;
}

// Функция для получения контрастного текста
export function getContrastText(backgroundColor: string): string {
  // Преобразование hex в RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Расчет относительной яркости
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

// Функции для генерации CSS переменных
export function generateCSSVariables(theme: ColorScheme): string {
  return `
    --primary: ${theme.primary};
    --secondary: ${theme.secondary};
    --accent: ${theme.accent};
    --background-primary: ${theme.background.primary};
    --background-secondary: ${theme.background.secondary};
    --background-tertiary: ${theme.background.tertiary};
    --text-primary: ${theme.text.primary};
    --text-secondary: ${theme.text.secondary};
    --text-muted: ${theme.text.muted};
    --border-light: ${theme.border.light};
    --border-medium: ${theme.border.medium};
    --success: ${theme.states.success};
    --warning: ${theme.states.warning};
    --error: ${theme.states.error};
    --diff-1: ${theme.markers.diff.one};
    --diff-2: ${theme.markers.diff.two};
    --diff-3: ${theme.markers.diff.three};
    --rarity-1: ${theme.markers.rarity.one};
    --rarity-2: ${theme.markers.rarity.two};
    --rarity-3: ${theme.markers.rarity.three};
    --rarity-4: ${theme.markers.rarity.four};
    --rarity-5: ${theme.markers.rarity.five};
  `;
}

// Утилита для управления прозрачностью
export function withOpacity(color: string, opacity: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
