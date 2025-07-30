import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface HaplogroupSelectorProps {
  selected: string[];
  onChange: (groups: string[]) => void;
}

export const HaplogroupSelector: React.FC<HaplogroupSelectorProps> = ({ 
  selected, 
  onChange 
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-2">
      {/* TODO: Реализовать селектор гаплогрупп */}
      <select 
        multiple
        value={selected}
        onChange={(e) => {
          const values = Array.from(e.target.selectedOptions, option => option.value);
          onChange(values);
        }}
        className="w-full p-2 border rounded"
      >
        <option value="">Select haplogroups...</option>
      </select>
    </div>
  );
}; 