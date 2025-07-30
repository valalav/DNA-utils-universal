'use client';

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectAppearance } from '@/store/userProfile';
import { colorSchemes, type ColorSchemeName } from '@/config/colorSchemes';

export const ColorSchemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const appearance = useSelector(selectAppearance);

  useEffect(() => {
    let scheme;
    const currentScheme = appearance.colorScheme as ColorSchemeName;
    
    if (currentScheme in colorSchemes) {
      scheme = colorSchemes[currentScheme];
    } 
    else if (appearance.customColorSchemes?.length) {
      scheme = appearance.customColorSchemes.find(s => s.name === currentScheme);
    }

    if (!scheme || !scheme.colors) {
      scheme = colorSchemes.classic;
    }

    Object.entries(scheme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value as string);
    });
    
    localStorage.setItem('color-scheme', currentScheme);
  }, [appearance.colorScheme, appearance.customColorSchemes]);

  return children;
};