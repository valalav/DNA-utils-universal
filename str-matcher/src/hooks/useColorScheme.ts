import { useState, useEffect } from 'react';
import { colorSchemes, type ColorSchemeName } from '@/config/colorSchemes';

export function useColorScheme(initialTheme: ColorSchemeName = 'classic') {
  const [theme, setTheme] = useState<ColorSchemeName>(initialTheme);

  useEffect(() => {
    // Получаем цветовую схему
    const scheme = colorSchemes[theme];
    
    // Применяем CSS переменные
    Object.entries(scheme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
    
  }, [theme]);

  return {
    currentTheme: theme,
    setTheme,
    availableThemes: colorSchemes
  };
}