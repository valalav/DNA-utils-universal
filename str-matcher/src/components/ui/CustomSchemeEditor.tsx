'use client';

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { colorSchemes as predefinedColorSchemes } from '@/config/colorSchemes';
import { addCustomColorScheme } from '@/store/userProfile';
import { Download, Upload, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

type ColorSchemeKey = keyof typeof predefinedColorSchemes;
type ColorKey = 
  | 'primary' | 'primary-hover' | 'secondary' | 'accent'
  | 'background-primary' | 'background-secondary' | 'background-tertiary' | 'background-hover' | 'background-selected'
  | 'text-primary' | 'text-secondary' | 'text-muted' | 'text-inverse' | 'text-link' | 'text-link-hover'
  | 'border-light' | 'border-medium' | 'border-dark' | 'border-focus'
  | 'success' | 'warning' | 'error' | 'info'
  | 'diff-1' | 'diff-2' | 'diff-3'
  | 'rarity-1' | 'rarity-2' | 'rarity-3' | 'rarity-4' | 'rarity-5'
  | 'button-primary' | 'button-primary-hover' | 'button-secondary' | 'button-secondary-hover'
  | 'input-background' | 'input-border' | 'input-focus'
  | 'overlay' | 'shadow-sm' | 'shadow-md' | 'shadow-lg'
  
  // Form Controls
  | 'control-background' | 'control-border' | 'control-text'
  | 'control-placeholder' | 'control-hover' | 'control-focus'
  
  // Tables
  | 'table-header-background' | 'table-header-text' | 'table-row-hover'
  | 'table-border' | 'table-cell-background'
  
  // Marker Components
  | 'marker-background' | 'marker-border' | 'marker-text'
  | 'marker-hover' | 'marker-active' | 'marker-header-background'
  
  // Action Buttons
  | 'action-primary-background' | 'action-primary-text' | 'action-primary-hover'
  | 'action-secondary-background' | 'action-secondary-text' | 'action-secondary-hover'
  | 'action-danger-background' | 'action-danger-text' | 'action-danger-hover'
  
  // Filters and Search
  | 'filter-background' | 'filter-border' | 'filter-text' | 'filter-placeholder'
  | 'search-background' | 'search-border' | 'search-text' | 'search-placeholder'
  
  // Panels and Sections
  | 'panel-background' | 'panel-border'
  | 'section-background' | 'section-border'
  | 'section-header-background' | 'section-header-text'
  
  // Form Elements
  | 'checkbox-background' | 'checkbox-border' | 'checkbox-checked'
  | 'radio-background' | 'radio-border' | 'radio-checked';

interface ColorGroupItem {
  key: ColorKey;
  label: string;
  defaultValue: string;
}

interface ColorGroup {
  name: string;
  colors: ColorGroupItem[];
}

const colorGroups: ColorGroup[] = [
  {
    name: 'Main Colors',
    colors: [
      { key: 'primary', label: 'Primary', defaultValue: '#2C5282' },
      { key: 'primary-hover', label: 'Primary Hover', defaultValue: '#2B6CB0' },
      { key: 'secondary', label: 'Secondary', defaultValue: '#4A5568' },
      { key: 'accent', label: 'Accent', defaultValue: '#5A67D8' }
    ]
  },
  {
    name: 'Backgrounds',
    colors: [
      { key: 'background-primary', label: 'Primary Background', defaultValue: '#FFFFFF' },
      { key: 'background-secondary', label: 'Secondary Background', defaultValue: '#F7FAFC' },
      { key: 'background-tertiary', label: 'Tertiary Background', defaultValue: '#EDF2F7' },
      { key: 'background-hover', label: 'Hover Background', defaultValue: '#E2E8F0' },
      { key: 'background-selected', label: 'Selected Background', defaultValue: '#EBF8FF' }
    ]
  },
  {
    name: 'Text',
    colors: [
      { key: 'text-primary', label: 'Primary Text', defaultValue: '#2D3748' },
      { key: 'text-secondary', label: 'Secondary Text', defaultValue: '#4A5568' },
      { key: 'text-muted', label: 'Muted Text', defaultValue: '#718096' },
      { key: 'text-inverse', label: 'Inverse Text', defaultValue: '#FFFFFF' },
      { key: 'text-link', label: 'Link Text', defaultValue: '#3182CE' },
      { key: 'text-link-hover', label: 'Link Hover', defaultValue: '#2C5282' }
    ]
  },
  {
    name: 'Borders',
    colors: [
      { key: 'border-light', label: 'Light Border', defaultValue: '#E2E8F0' },
      { key: 'border-medium', label: 'Medium Border', defaultValue: '#CBD5E0' },
      { key: 'border-dark', label: 'Dark Border', defaultValue: '#A0AEC0' },
      { key: 'border-focus', label: 'Focus Border', defaultValue: '#4299E1' }
    ]
  },
  {
    name: 'System',
    colors: [
      { key: 'success', label: 'Success', defaultValue: '#38A169' },
      { key: 'warning', label: 'Warning', defaultValue: '#D69E2E' },
      { key: 'error', label: 'Error', defaultValue: '#E53E3E' },
      { key: 'info', label: 'Info', defaultValue: '#3182CE' }
    ]
  },
  {
    name: 'Marker Differences',
    colors: [
      { key: 'diff-1', label: 'Small Difference', defaultValue: '#4299E1' },
      { key: 'diff-2', label: 'Medium Difference', defaultValue: '#2B6CB0' },
      { key: 'diff-3', label: 'Large Difference', defaultValue: '#2A4365' }
    ]
  },
  {
    name: 'Marker Rarity',
    colors: [
      { key: 'rarity-1', label: 'Very Rare', defaultValue: '#2C5282' },
      { key: 'rarity-2', label: 'Rare', defaultValue: '#3182CE' },
      { key: 'rarity-3', label: 'Uncommon', defaultValue: '#4299E1' },
      { key: 'rarity-4', label: 'Common', defaultValue: '#63B3ED' },
      { key: 'rarity-5', label: 'Very Common', defaultValue: '#90CDF4' }
    ]
  },
  {
    name: 'Controls',
    colors: [
      { key: 'button-primary', label: 'Primary Button', defaultValue: '#4A5568' },
      { key: 'button-primary-hover', label: 'Primary Button Hover', defaultValue: '#2D3748' },
      { key: 'button-secondary', label: 'Secondary Button', defaultValue: '#EDF2F7' },
      { key: 'button-secondary-hover', label: 'Secondary Button Hover', defaultValue: '#E2E8F0' },
      { key: 'input-background', label: 'Input Background', defaultValue: '#FFFFFF' },
      { key: 'input-border', label: 'Input Border', defaultValue: '#CBD5E0' },
      { key: 'input-focus', label: 'Input Focus', defaultValue: '#4299E1' }
    ]
  },
  {
    name: 'Overlays',
    colors: [
      { key: 'overlay', label: 'Overlay Background', defaultValue: 'rgba(0, 0, 0, 0.5)' },
      { key: 'shadow-sm', label: 'Small Shadow', defaultValue: 'rgba(0, 0, 0, 0.1)' },
      { key: 'shadow-md', label: 'Medium Shadow', defaultValue: 'rgba(0, 0, 0, 0.2)' },
      { key: 'shadow-lg', label: 'Large Shadow', defaultValue: 'rgba(0, 0, 0, 0.3)' }
    ]
  },
  {
    name: 'Form Controls',
    colors: [
      { key: 'control-background', label: 'Control Background', defaultValue: '#FFFFFF' },
      { key: 'control-border', label: 'Control Border', defaultValue: '#E2E8F0' },
      { key: 'control-text', label: 'Control Text', defaultValue: '#2D3748' },
      { key: 'control-placeholder', label: 'Placeholder', defaultValue: '#A0AEC0' },
      { key: 'control-hover', label: 'Hover State', defaultValue: '#F7FAFC' },
      { key: 'control-focus', label: 'Focus State', defaultValue: '#EBF8FF' }
    ]
  },
  {
    name: 'Tables',
    colors: [
      { key: 'table-header-background', label: 'Header Background', defaultValue: '#F7FAFC' },
      { key: 'table-header-text', label: 'Header Text', defaultValue: '#2D3748' },
      { key: 'table-row-hover', label: 'Row Hover', defaultValue: '#F7FAFC' },
      { key: 'table-border', label: 'Table Border', defaultValue: '#E2E8F0' },
      { key: 'table-cell-background', label: 'Cell Background', defaultValue: '#FFFFFF' }
    ]
  },
  {
    name: 'Marker Components',
    colors: [
      { key: 'marker-background', label: 'Marker Background', defaultValue: '#FFFFFF' },
      { key: 'marker-border', label: 'Marker Border', defaultValue: '#E2E8F0' },
      { key: 'marker-text', label: 'Marker Text', defaultValue: '#2D3748' },
      { key: 'marker-hover', label: 'Marker Hover', defaultValue: '#F7FAFC' },
      { key: 'marker-active', label: 'Marker Active', defaultValue: '#EBF8FF' },
      { key: 'marker-header-background', label: 'Header Background', defaultValue: '#F7FAFC' }
    ]
  },
  {
    name: 'Action Buttons',
    colors: [
      { key: 'action-primary-background', label: 'Primary Background', defaultValue: '#4299E1' },
      { key: 'action-primary-text', label: 'Primary Text', defaultValue: '#FFFFFF' },
      { key: 'action-primary-hover', label: 'Primary Hover', defaultValue: '#3182CE' },
      { key: 'action-secondary-background', label: 'Secondary Background', defaultValue: '#EDF2F7' },
      { key: 'action-secondary-text', label: 'Secondary Text', defaultValue: '#4A5568' },
      { key: 'action-secondary-hover', label: 'Secondary Hover', defaultValue: '#E2E8F0' },
      { key: 'action-danger-background', label: 'Danger Background', defaultValue: '#F56565' },
      { key: 'action-danger-text', label: 'Danger Text', defaultValue: '#FFFFFF' },
      { key: 'action-danger-hover', label: 'Danger Hover', defaultValue: '#E53E3E' }
    ]
  },
  {
    name: 'Filters and Search',
    colors: [
      { key: 'filter-background', label: 'Filter Background', defaultValue: '#FFFFFF' },
      { key: 'filter-border', label: 'Filter Border', defaultValue: '#E2E8F0' },
      { key: 'filter-text', label: 'Filter Text', defaultValue: '#2D3748' },
      { key: 'filter-placeholder', label: 'Filter Placeholder', defaultValue: '#A0AEC0' },
      { key: 'search-background', label: 'Search Background', defaultValue: '#FFFFFF' },
      { key: 'search-border', label: 'Search Border', defaultValue: '#E2E8F0' },
      { key: 'search-text', label: 'Search Text', defaultValue: '#2D3748' },
      { key: 'search-placeholder', label: 'Search Placeholder', defaultValue: '#A0AEC0' }
    ]
  },
  {
    name: 'Panels and Sections',
    colors: [
      { key: 'panel-background', label: 'Panel Background', defaultValue: '#FFFFFF' },
      { key: 'panel-border', label: 'Panel Border', defaultValue: '#E2E8F0' },
      { key: 'section-background', label: 'Section Background', defaultValue: '#F7FAFC' },
      { key: 'section-border', label: 'Section Border', defaultValue: '#E2E8F0' },
      { key: 'section-header-background', label: 'Header Background', defaultValue: '#F7FAFC' },
      { key: 'section-header-text', label: 'Header Text', defaultValue: '#2D3748' }
    ]
  },
  {
    name: 'Form Elements',
    colors: [
      { key: 'checkbox-background', label: 'Checkbox Background', defaultValue: '#FFFFFF' },
      { key: 'checkbox-border', label: 'Checkbox Border', defaultValue: '#E2E8F0' },
      { key: 'checkbox-checked', label: 'Checkbox Checked', defaultValue: '#4299E1' },
      { key: 'radio-background', label: 'Radio Background', defaultValue: '#FFFFFF' },
      { key: 'radio-border', label: 'Radio Border', defaultValue: '#E2E8F0' },
      { key: 'radio-checked', label: 'Radio Checked', defaultValue: '#4299E1' }
    ]
  }
] as const;

// Определяем тип для цветовой схемы
type ColorSchemeColors = {
  [K in ColorKey]: string;
};

type ColorScheme = {
  colors: ColorSchemeColors;
};

interface Props {
  customColors?: Partial<Record<ColorKey, string>>;
  baseScheme?: ColorSchemeKey;
  onClose: () => void;
  onSave?: (colors: Record<string, string>) => void;
}

export const CustomSchemeEditor: React.FC<Props> = ({
  customColors = {},
  baseScheme = 'classic',
  onClose,
  onSave
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [schemeName, setSchemeName] = useState('');
  const [colors, setColors] = useState<Partial<Record<ColorKey, string>>>(customColors);

  const handleColorChange = (key: ColorKey, value: string) => {
    // Проверяем, что значение является валидным HEX-цветом
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
      setColors(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const handleSubmit = () => {
    if (!schemeName.trim()) return;

    // Создаем полный объект цветов, используя базовую схему как основу
    const baseColors = predefinedColorSchemes[baseScheme].colors;
    const completeColors = Object.keys(baseColors).reduce((acc, key) => {
      const colorKey = key as ColorKey;
      return {
        ...acc,
        [colorKey]: colors[colorKey] || baseColors[colorKey]
      };
    }, {} as ColorSchemeColors);

    dispatch(addCustomColorScheme({
      name: schemeName,
      colors: completeColors
    }));

    if (onSave) {
      onSave(completeColors);
    }
    
    onClose();
  };

  const exportScheme = () => {
    const baseColors = predefinedColorSchemes[baseScheme].colors;
    const completeColors = Object.keys(baseColors).reduce((acc, key) => {
      const colorKey = key as ColorKey;
      return {
        ...acc,
        [colorKey]: colors[colorKey] || baseColors[colorKey]
      };
    }, {} as ColorSchemeColors);

    const schemeData = {
      name: schemeName,
      colors: completeColors
    };
    
    const blob = new Blob([JSON.stringify(schemeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schemeName || 'color-scheme'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importScheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const scheme = JSON.parse(content);
        if (scheme.name && scheme.colors) {
          setSchemeName(scheme.name);
          setColors(scheme.colors);
        }
      } catch (error) {
        console.error('Failed to parse color scheme:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-primary rounded-lg w-full max-w-4xl mx-4">
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-border-light bg-background-primary">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">{t('colorSchemes.customScheme.title')}</h2>
            <input
              type="text"
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              className="px-3 py-1 border rounded text-sm input-primary"
              placeholder={t('colorSchemes.customScheme.schemeName')}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={exportScheme}
              className="p-2 hover:bg-background-secondary rounded transition-colors"
              title={t('colorSchemes.customScheme.exportScheme')}
            >
              <Download className="w-4 h-4" />
            </button>
            <label
              className="p-2 hover:bg-background-secondary rounded transition-colors cursor-pointer"
              title={t('colorSchemes.customScheme.importScheme')}
            >
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".json"
                onChange={importScheme}
                className="hidden"
              />
            </label>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-secondary rounded transition-colors"
              title={t('colorSchemes.customScheme.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {colorGroups.map(group => (
              <div key={group.name} className="space-y-4">
                <h3 className="text-sm font-medium text-text-secondary">{group.name}</h3>
                <div className="space-y-3">
                  {group.colors.map(({ key, label, defaultValue }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-text-secondary">{label}</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={colors[key] || predefinedColorSchemes[baseScheme].colors[key] || defaultValue}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={colors[key] || predefinedColorSchemes[baseScheme].colors[key] || defaultValue}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="flex-1 text-xs input-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex justify-end gap-2 p-4 border-t border-border-light bg-background-primary">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            {t('colorSchemes.customScheme.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!schemeName.trim()}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {t('colorSchemes.customScheme.createScheme')}
          </button>
        </div>
      </div>
    </div>
  );
};