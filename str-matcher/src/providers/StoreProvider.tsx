'use client';

import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { store } from '@/store/store';
import { selectAppearance } from '@/store/userProfile';
import { colorSchemes } from '@/config/colorSchemes';

// Компонент для применения цветовых схем
const ColorSchemeApplier = ({ children }: { children: React.ReactNode }) => {
  const appearance = useSelector(selectAppearance);

  useEffect(() => {
    // Получаем выбранную схему
    let scheme;
    if (appearance.colorScheme in colorSchemes) {
      scheme = colorSchemes[appearance.colorScheme as keyof typeof colorSchemes];
    } else if (appearance.customColorSchemes) {
      scheme = appearance.customColorSchemes.find(s => s.name === appearance.colorScheme);
    }
    
    if (scheme?.colors) {
      // Применяем все цвета через CSS переменные
      Object.entries(scheme.colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value as string);
      });
    } else {
      // Если схема не найдена, используем классическую
      const defaultScheme = colorSchemes.classic;
      Object.entries(defaultScheme.colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
      });
    }

    // Сохраняем выбор в localStorage
    localStorage.setItem('color-scheme', appearance.colorScheme);
  }, [appearance.colorScheme, appearance.customColorSchemes]);

  return <>{children}</>;
};

// Основной провайдер приложения
export default function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ColorSchemeApplier>
        {children}
      </ColorSchemeApplier>
    </Provider>
  );
}