"use client";

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Repository } from '@/utils/constants';
import { useTranslation } from '@/hooks/useTranslation';

interface DataSourceCardProps {
  repository: Repository;
  isSelected: boolean;
  onToggle: () => void;
  onLoad: () => void;
  loading: boolean;
}

/**
 * Компонент карточки источника данных в современном flat-дизайне
 */
const DataSourceCard: React.FC<DataSourceCardProps> = ({
  repository,
  isSelected,
  onToggle,
  onLoad,
  loading
}) => {
  const { t } = useTranslation();
  
  // Определяем цвет полосы слева в зависимости от категории
  const getCategoryColor = (category?: string): string => {
    if (!category) return '#8d99ae'; // Default color
    
    switch (category.toLowerCase()) {
      case 'y-dna':
        return repository.name.includes('G') ? '#3a86ff' : 
               repository.name.includes('R1a') ? '#4361ee' : 
               repository.name.includes('R1b') ? '#4895ef' :
               repository.name.includes('J') ? '#4cc9f0' : 
               repository.name.includes('E') ? '#4895ef' : 
               repository.name.includes('I') ? '#3a0ca3' : '#8d99ae';
      case 'mtdna':
        return '#f72585';
      default:
        return '#8d99ae';
    }
  };
  
  const categoryColor = getCategoryColor(repository.category);
  
  return (
    <div className="relative overflow-hidden rounded-sm border border-flat-border hover:border-flat-primary/30 transition-all duration-200 bg-flat-card-bg flex flex-col">
      {/* Цветная полоса слева */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ backgroundColor: categoryColor }}
      />
      
      <div className="p-1.5 pl-2.5 flex flex-col">
        {/* Заголовок и чекбокс */}
        <div className="flex items-center gap-1 mb-0.5">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            className="h-3 w-3 rounded-[2px] border-[1.5px] transition-all data-[state=checked]:bg-flat-primary"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {repository.name}
            </h3>
          </div>
        </div>
        
        {/* Информация о базе данных в компактном формате */}
        <div className="flex text-xs mb-0.5">
          <div style={{ fontFamily: 'var(--font-inter)' }}>
            <span className="opacity-80">{repository.category || t('database.uncategorized')}</span>
          </div>
        </div>
        
        {/* Количество профилей и кнопка загрузки на одной строке */}
        <div className="flex justify-between items-center gap-1">
          <div className="text-xs font-medium" style={{ fontFamily: 'var(--font-roboto-mono)', color: categoryColor }}>
            {repository.id === 'aadna' ? '~1,500' : 
             repository.id === 'G' ? '~13,000' : 
             repository.id === 'r1a' ? '~25,000' : 
             repository.id === 'J2' ? '~19,000' : 
             repository.id === 'J1' ? '~18,000' : 
             repository.id === 'E' ? '~23,000' : 
             repository.id === 'I' ? '~56,000' : 
             repository.id === 'r1b' ? '~4,300' : 
             repository.id === 'Others' ? '~20,000' : '~1,000'}
          </div>
          <button
            onClick={onLoad}
            disabled={loading}
            className="text-xs px-1.5 py-0.5 bg-transparent border border-flat-border hover:border-flat-primary/50 text-text-primary rounded hover:bg-flat-background transition-all"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            {loading ? 
              <span className="flex items-center justify-center gap-1">
                <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                {t('common.loading')}
              </span> : 
              t('common.load')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataSourceCard;