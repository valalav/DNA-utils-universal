"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { HistoryItem } from '@/utils/constants';
import { useTranslation } from '@/hooks/useTranslation';

interface SearchHistoryProps {
 history: HistoryItem[];
 onKitNumberClick: (kitNumber: string) => void;
 onClearHistory?: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ 
 history, 
 onKitNumberClick,
 onClearHistory 
}) => {
 const { t } = useTranslation();

 const formatDate = (date: Date) => {
   return new Intl.DateTimeFormat(undefined, {
     year: 'numeric',
     month: 'short',
     day: '2-digit',
     hour: '2-digit',
     minute: '2-digit'
   }).format(date);
 };

 if (history.length === 0) {
   return (
     <Card className="mt-4">
       <CardContent className="p-4 text-center text-text-secondary">
         {t('searchHistory.noHistory')}
       </CardContent>
     </Card>
   );
 }

 return (
   <Card className="mt-4">
     <CardHeader className="py-2 px-4 flex flex-row justify-between items-center">
       <CardTitle className="text-sm">
         {t('searchHistory.title')}
       </CardTitle>
       {onClearHistory && (
         <button
           onClick={onClearHistory}
           className="text-xs text-text-secondary hover:text-text-primary transition-colors"
           title={t('searchHistory.clearHistoryTooltip')}
         >
           {t('searchHistory.clearHistory')}
         </button>
       )}
     </CardHeader>
     <CardContent className="p-2">
       <div className="flex gap-2 overflow-x-auto">
         {history.map((item, index) => (
           <div 
             key={`${item.kitNumber}-${item.timestamp}-${index}`}
             className="flex-none p-2 border rounded hover:bg-background-secondary 
                       transition-colors cursor-pointer min-w-[120px] max-w-[200px]"
             onClick={() => onKitNumberClick(item.kitNumber)}
             title={t('searchHistory.clickToLoad')}
           >
             <div className="text-accent hover:text-accent/80 text-sm font-medium truncate">
               {item.kitNumber}
             </div>
             {item.name && (
               <div className="text-xs text-text-secondary truncate">
                 {item.name}
               </div>
             )}
             <div className="flex flex-col text-xs">
               {item.haplogroup && (
                 <span className="text-text-secondary">
                   {item.haplogroup}
                 </span>
               )}
               {item.timestamp && (
                 <span className="text-text-muted text-[10px]">
                   {t('searchHistory.lastSearched')}: {formatDate(item.timestamp)}
                 </span>
               )}
             </div>
           </div>
         ))}
       </div>
       
       {history.length > 0 && (
         <div className="mt-2 text-xs text-text-muted text-center">
           {t('searchHistory.recentSearches')}: {history.length}
         </div>
       )}
     </CardContent>
   </Card>
 );
};

export default SearchHistory;