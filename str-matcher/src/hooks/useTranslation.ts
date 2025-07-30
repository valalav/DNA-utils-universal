import { useState, useCallback } from 'react';
import { translations, type Language } from '@/config/translations';

export type TranslationKey = string;

function getBrowserLanguage(): Language {
  const browserLang = typeof window !== 'undefined' 
    ? window.navigator.language.split('-')[0]
    : 'en';
    
  return browserLang === 'ru' ? 'ru' : 'en';
}

export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem('language') as Language) || getBrowserLanguage();
  });

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem('language', lang);
    setCurrentLanguage(lang);
    document.documentElement.lang = lang;
    // Принудительно обновляем страницу после смены языка
    window.location.reload();
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: string | Record<string, unknown> = translations[currentLanguage];
    
    for (const k of keys) {
      if (typeof value !== 'object' || value === null || !(k in value)) {
        return key;
      }
      value = value[k] as string | Record<string, unknown>;
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (params) {
      return Object.entries(params).reduce(
        (str, [param, val]) => str.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val)),
        value
      );
    }

    return value;
  }, [currentLanguage]);

  return {
    t,
    language: currentLanguage,
    setLanguage
  };
}