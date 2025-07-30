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
     'Kit Number', 
     'Name', 
     'Country', 
     'Haplogroup',
     'Genetic Distance',
     'Compared Markers',
     'Identical Markers',
     'Percent Identical'
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
   link.download = 'str_matches.csv';
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
     link.download = 'str_matches.jpg';
     link.href = canvas.toDataURL('image/jpeg', 0.9);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
   } catch (error) {
     console.error('Error exporting image:', error);
   }
 }
};
