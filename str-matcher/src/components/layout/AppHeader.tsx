"use client";

import React from 'react';
import { ColorSchemeSelector } from '@/components/ui/ColorSchemeSelector';
import { useTranslation } from '@/hooks/useTranslation';
import type { Language } from '@/config/translations';

export const AppHeader = () => {
  const { t, language, setLanguage } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value as Language;
    setLanguage(newLanguage);
  };

  return (
    <header className="border-b border-border-light bg-background-primary">
      <div className="max-w-screen-xl mx-auto px-4 py-3">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-xl font-semibold text-text-primary">
            {t('header.title')}
          </h1>
          
          <div className="flex items-center gap-4">
            <a 
              href="https://docs.google.com/document/d/1NI4XHMHJKxPBWT37qGGUwNNGA8Cs9AWggmVr7alFN5E/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              {t('header.instructions')}
            </a>
            <div className="w-px h-6 bg-border-light" />
            <ColorSchemeSelector />
            <div className="w-px h-6 bg-border-light" />
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-background-primary border border-border-light rounded px-2 py-1
                       text-sm focus:border-accent focus:outline-none cursor-pointer"
              aria-label={t('header.dropdownTitle')}
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};