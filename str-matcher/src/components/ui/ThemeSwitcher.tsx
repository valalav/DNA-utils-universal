'use client';

import React from 'react';
import { colorSchemes, type ColorSchemeName } from '@/config/colorSchemes';

interface ThemeSwitcherProps {
  currentTheme: ColorSchemeName;
  onThemeChange: (theme: ColorSchemeName) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onThemeChange
}) => {
  return (
    <div className="flex gap-2">
      {Object.entries(colorSchemes).map(([key, scheme]) => (
        <button
          key={key}
          onClick={() => onThemeChange(key as ColorSchemeName)}
          className={`p-2 rounded transition-colors ${
            currentTheme === key 
              ? 'bg-primary text-white' 
              : 'bg-background-secondary hover:bg-background-tertiary'
          }`}
        >
          {scheme.name}
        </button>
      ))}
    </div>
  );
};