'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { useSelector } from 'react-redux';
import { selectAppearance } from '@/store/userProfile';
import type { UserProfile } from '@/store/userProfile';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const appearance = useSelector(selectAppearance);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Управление темной темой
    if (appearance.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', appearance.theme === 'dark');
    }

    // Применение размера шрифта
    root.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }[appearance.fontSize];

    // Применение плотности интерфейса
    root.setAttribute('data-density', appearance.density);

    // Установка акцентного цвета
    root.style.setProperty('--primary', appearance.accentColor);
    
  }, [appearance]);

  return children;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <div className="min-h-screen bg-background-primary text-text-primary transition-colors">
          {children}
        </div>
      </ThemeProvider>
    </Provider>
  );
}

export default Providers;