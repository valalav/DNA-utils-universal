"use client";

import html2canvas from 'html2canvas';
import { useTranslation } from '@/hooks/useTranslation';
import type { STRMatch } from '@/utils/constants';

interface ExportOptions {
 format: 'csv' | 'jpg';
 includeHaplogroups: boolean;
}

export const exportMatches = async (matches: STRMatch[], options: ExportOptions) => {
 const { t } = useTranslation();

 if (options.format === 'csv') {
   const headers = [
     t('matches.exportHeaders.kitNumber'),
     t('matches.exportHeaders.name'),
     t('matches.exportHeaders.country'),
     t('matches.exportHeaders.haplogroup'),
     t('matches.exportHeaders.geneticDistance'),
     t('matches.exportHeaders.comparedMarkers'),
     t('matches.exportHeaders.identicalMarkers'),
     t('matches.exportHeaders.percentIdentical')
   ];

   const rows = matches.map(match => [
     match.profile.kitNumber,
     match.profile.name || '',
     match.profile.country || '',
     match.profile.haplogroup || '',
     match.distance.toString(),
     match.comparedMarkers.toString(),
     match.identicalMarkers.toString(),
     match.percentIdentical.toFixed(1)
   ]);
   
   const csv = [headers, ...rows]
     .map(row => row.map(cell => `"${cell}"`).join(','))
     .join('\n');

   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = t('matches.exportFileNames.csv');
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(url);
   return;
 }

 if (options.format === 'jpg') {
   const table = document.querySelector('.matches-table');
   if (!table) return;

   try {
     const canvas = await html2canvas(table as HTMLElement, {
       background: '#ffffff',
       scale: 2,
       logging: false,
       useCORS: true
     } as any);

     const link = document.createElement('a');
     link.download = t('matches.exportFileNames.jpg');
     link.href = canvas.toDataURL('image/jpeg', 0.9);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
   } catch (error) {
     console.error('Error exporting image:', error);
   }
 }
};
