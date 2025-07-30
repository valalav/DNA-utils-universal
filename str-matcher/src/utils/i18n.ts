import { useState, useCallback } from 'react';
import { logger } from './logger';

type Locale = 'en' | 'ru';
type TranslationKey = string;
type TranslationValue = string | Record<string, string>;

class I18nManager {
 private static instance: I18nManager;
 private currentLocale: Locale = 'en';
 private translations: Record<Locale, Record<TranslationKey, TranslationValue>> = {
   en: {
     // General
     'app.title': 'STR Matcher',
     'app.description': 'Y-DNA STR Analysis Tool',
     'app.loading': 'Loading...',
     'app.error': 'Error',
     'app.success': 'Success',

     // Notifications
     'notification.markAsRead': 'Mark as read',
     'notification.clearAll': 'Clear all',
     'notification.noNotifications': 'No notifications',

     // Buttons
     'button.save': 'Save',
     'button.cancel': 'Cancel',
     'button.delete': 'Delete',
     'button.edit': 'Edit',
     'button.search': 'Search',
     'button.clear': 'Clear',
     'button.export': 'Export',
     'button.import': 'Import',

     // Forms
     'form.required': 'Required field',
     'form.invalid': 'Invalid value',
     'form.submit': 'Submit',

     // STR specific
     'str.kitNumber': 'Kit Number',
     'str.haplogroup': 'Haplogroup',
     'str.markers': 'Markers',
     'str.geneticDistance': 'Genetic Distance',
     'str.matches': 'Matches',
     'str.noMatches': 'No matches found',

     // Settings
     'settings.markers.title': 'STR Markers',
     'settings.markers.count': '{count} markers selected',
     'settings.gd.title': 'Genetic Distance',
     'settings.gd.max': 'Max GD',
     'settings.matches.title': 'Matches',
     'settings.matches.count': 'Show {count} matches',
     
     // Sort Options
     'sort.default': 'FTDNA Default Order',
     'sort.mutation_rate': 'By Mutation Rate',
     
     // Colors
     'colors.primary': 'Primary',
     'colors.accent': 'Accent',
     'colors.rare': 'Rare',
     'colors.common': 'Common',
     'colors.diff': 'Differences'
   },
   ru: {
     // Общие фразы
     'app.title': 'STR Matcher',
     'app.description': 'Инструмент анализа STR Y-DNA',
     'app.loading': 'Загрузка...',
     'app.error': 'Ошибка',
     'app.success': 'Успешно',

     // Уведомления  
     'notification.markAsRead': 'Отметить как прочитанное',
     'notification.clearAll': 'Очистить все',
     'notification.noNotifications': 'Нет уведомлений',

     // Кнопки
     'button.save': 'Сохранить',
     'button.cancel': 'Отмена',
     'button.delete': 'Удалить',
     'button.edit': 'Редактировать', 
     'button.search': 'Поиск',
     'button.clear': 'Очистить',
     'button.export': 'Экспорт',
     'button.import': 'Импорт',

     // Формы
     'form.required': 'Обязательное поле',
     'form.invalid': 'Неверное значение',
     'form.submit': 'Отправить',

     // STR специфичные
     'str.kitNumber': 'Номер набора',
     'str.haplogroup': 'Гаплогруппа',
     'str.markers': 'Маркеры',
     'str.geneticDistance': 'Генетическая дистанция',
     'str.matches': 'Совпадения',
     'str.noMatches': 'Совпадений не найдено',

     // Настройки
     'settings.markers.title': 'STR Маркеры',
     'settings.markers.count': 'Выбрано маркеров: {count}',
     'settings.gd.title': 'Генетическая дистанция',
     'settings.gd.max': 'Макс. ГД',
     'settings.matches.title': 'Совпадения',
     'settings.matches.count': 'Показать {count} совпадений',

     // Опции сортировки
     'sort.default': 'Стандартный порядок FTDNA',
     'sort.mutation_rate': 'По скорости мутации',

     // Цвета
     'colors.primary': 'Основной',
     'colors.accent': 'Акцент',
     'colors.rare': 'Редкий',
     'colors.common': 'Частый',
     'colors.diff': 'Различия'
   }
 };

 private constructor() {
   const browserLang = navigator.language.split('-')[0];
   if (browserLang === 'ru') {
     this.currentLocale = 'ru';
   }
 }

 static getInstance(): I18nManager {
   if (!I18nManager.instance) {
     I18nManager.instance = new I18nManager();
   }
   return I18nManager.instance;
 }

 setLocale(locale: Locale): void {
   this.currentLocale = locale;
 }

 getLocale(): Locale {
   return this.currentLocale;
 }

 translate(key: TranslationKey, params?: Record<string, string>): string {
   const translation = this.translations[this.currentLocale][key];
   
   if (!translation) {
     logger.warn(`Translation missing for key: ${key}`);
     return key;
   }

   if (typeof translation === 'string') {
     if (!params) return translation;

     return Object.entries(params).reduce(
       (str, [key, value]) => str.replace(`{${key}}`, value),
       translation
     );
   }

   return translation[this.currentLocale] || key;
 }

 t(key: TranslationKey, params?: Record<string, string>): string {
   return this.translate(key, params);
 }

 formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
   return new Intl.NumberFormat(this.currentLocale, options).format(value);
 }

 formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
   return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
 }

 formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
   const rtf = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
   return rtf.format(value, unit);
 }
}

export const i18n = I18nManager.getInstance();

export function useTranslation() {
 const [locale, setLocale] = useState(i18n.getLocale());

 const changeLocale = useCallback((newLocale: Locale) => {
   i18n.setLocale(newLocale);
   setLocale(newLocale);
 }, []);

 return {
   t: i18n.t.bind(i18n),
   locale,
   changeLocale,
   formatNumber: i18n.formatNumber.bind(i18n),
   formatDate: i18n.formatDate.bind(i18n),
   formatRelativeTime: i18n.formatRelativeTime.bind(i18n)
 };
}