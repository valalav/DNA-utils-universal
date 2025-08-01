'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Languages } from 'lucide-react';
import { selectAppearance, updateAppearance } from '@/store/userProfile';
import { useTranslation } from '@/hooks/useTranslation';
import type { Language } from '@/config/translations';

export const LanguageSelector = () => {
 const dispatch = useDispatch();
 const { t } = useTranslation();
 const appearance = useSelector(selectAppearance);

 const handleLanguageChange = (lang: Language) => {
   dispatch(updateAppearance({ language: lang }));
 };

 const languages: Language[] = ['en', 'ru'];

 return (
   <div className="flex items-center gap-2">
     <Languages className="w-4 h-4 text-text-secondary" />
     <select
       value={appearance.language || 'en'}
       onChange={(e) => handleLanguageChange(e.target.value as Language)}
       className="bg-background-primary border border-border-light rounded px-2 py-1
                text-sm focus:border-accent focus:outline-none cursor-pointer"
       aria-label={t('header.dropdownTitle')}
     >
       {languages.map((code) => (
         <option key={code} value={code}>
           {t(`languages.${code}`)}
         </option>
       ))}
     </select>
   </div>
 );
};