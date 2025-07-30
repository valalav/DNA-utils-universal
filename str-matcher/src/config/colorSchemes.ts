export interface ColorScheme {
  name: string;
  colors: Record<string, string>;
}

export const colorSchemes: Record<string, ColorScheme> = {
  classic: {
    name: 'Classic',
    colors: {
      // Base Colors
      primary: '#2C5282',
      'primary-hover': '#2B6CB0',
      secondary: '#4A5568',
      accent: '#5A67D8',
      
      // Backgrounds
      'background-primary': '#FFFFFF',
      'background-secondary': '#F7FAFC',
      'background-tertiary': '#EDF2F7',
      'background-hover': '#E2E8F0',
      'background-selected': '#EBF8FF',
      
      // Text Colors
      'text-primary': '#2D3748',
      'text-secondary': '#4A5568',
      'text-muted': '#718096',
      'text-inverse': '#FFFFFF',
      'text-link': '#3182CE',
      'text-link-hover': '#2C5282',
      
      // Borders
      'border-light': '#E2E8F0',
      'border-medium': '#CBD5E0',
      'border-dark': '#A0AEC0',
      'border-focus': '#4299E1',
      
      // System Colors
      success: '#38A169',
      warning: '#D69E2E',
      error: '#E53E3E',
      info: '#3182CE',
      
      // Marker Differences
      'diff-1': '#4299E1',
      'diff-2': '#2B6CB0',
      'diff-3': '#2A4365',
      
      // Marker Rarity
      'rarity-1': '#2C5282',
      'rarity-2': '#3182CE',
      'rarity-3': '#4299E1',
      'rarity-4': '#63B3ED',
      'rarity-5': '#90CDF4',
      
      // Controls
      'button-primary': '#4A5568',
      'button-primary-hover': '#2D3748',
      'button-secondary': '#EDF2F7',
      'button-secondary-hover': '#E2E8F0',
      'input-background': '#FFFFFF',
      'input-border': '#CBD5E0',
      'input-focus': '#4299E1',
      
      // Overlays and Shadows
      overlay: 'rgba(0, 0, 0, 0.5)',
      'shadow-sm': 'rgba(0, 0, 0, 0.1)',
      'shadow-md': 'rgba(0, 0, 0, 0.2)',
      'shadow-lg': 'rgba(0, 0, 0, 0.3)',
      
      // Form Controls
      'control-background': '#FFFFFF',
      'control-border': '#E2E8F0',
      'control-text': '#2D3748',
      'control-placeholder': '#A0AEC0',
      'control-hover': '#F7FAFC',
      'control-focus': '#EBF8FF',
      
      // Tables
      'table-header-background': '#F7FAFC',
      'table-header-text': '#2D3748',
      'table-row-hover': '#F7FAFC',
      'table-border': '#E2E8F0',
      'table-cell-background': '#FFFFFF',
      
      // Marker Components
      'marker-background': '#FFFFFF',
      'marker-border': '#E2E8F0',
      'marker-text': '#2D3748',
      'marker-hover': '#F7FAFC',
      'marker-active': '#EBF8FF',
      'marker-header-background': '#F7FAFC',
      
      // Action Buttons
      'action-primary-background': '#4299E1',
      'action-primary-text': '#FFFFFF',
      'action-primary-hover': '#3182CE',
      'action-secondary-background': '#EDF2F7',
      'action-secondary-text': '#4A5568',
      'action-secondary-hover': '#E2E8F0',
      'action-danger-background': '#F56565',
      'action-danger-text': '#FFFFFF',
      'action-danger-hover': '#E53E3E',
      
      // Filters and Search
      'filter-background': '#FFFFFF',
      'filter-border': '#E2E8F0',
      'filter-text': '#2D3748',
      'filter-placeholder': '#A0AEC0',
      'search-background': '#FFFFFF',
      'search-border': '#E2E8F0',
      'search-text': '#2D3748',
      'search-placeholder': '#A0AEC0',
      
      // Panels and Sections
      'panel-background': '#FFFFFF',
      'panel-border': '#E2E8F0',
      'section-background': '#F7FAFC',
      'section-border': '#E2E8F0',
      'section-header-background': '#F7FAFC',
      'section-header-text': '#2D3748',
      
      // Checkboxes and Radio
      'checkbox-background': '#FFFFFF',
      'checkbox-border': '#E2E8F0',
      'checkbox-checked': '#4299E1',
      'radio-background': '#FFFFFF',
      'radio-border': '#E2E8F0',
      'radio-checked': '#4299E1'
    }
  },
  
  dark: {
    name: 'Dark',
    colors: {
      // Base Colors
      primary: '#4299E1',
      'primary-hover': '#3182CE',
      secondary: '#A0AEC0',
      accent: '#6B7FD7',
      
      // Backgrounds
      'background-primary': '#1A202C',
      'background-secondary': '#2D3748',
      'background-tertiary': '#4A5568',
      'background-hover': '#2D3748',
      'background-selected': '#2C5282',
      
      // Text Colors
      'text-primary': '#F7FAFC',
      'text-secondary': '#E2E8F0',
      'text-muted': '#A0AEC0',
      'text-inverse': '#1A202C',
      'text-link': '#63B3ED',
      'text-link-hover': '#4299E1',
      
      // Borders
      'border-light': '#4A5568',
      'border-medium': '#2D3748',
      'border-dark': '#1A202C',
      'border-focus': '#63B3ED',
      
      // System Colors
      success: '#48BB78',
      warning: '#ECC94B',
      error: '#F56565',
      info: '#4299E1',
      
      // Marker Differences
      'diff-1': '#63B3ED',
      'diff-2': '#4299E1',
      'diff-3': '#3182CE',
      
      // Marker Rarity
      'rarity-1': '#4299E1',
      'rarity-2': '#63B3ED',
      'rarity-3': '#90CDF4',
      'rarity-4': '#BEE3F8',
      'rarity-5': '#EBF8FF',
      
      // Controls
      'button-primary': '#4299E1',
      'button-primary-hover': '#3182CE',
      'button-secondary': '#2D3748',
      'button-secondary-hover': '#4A5568',
      'input-background': '#2D3748',
      'input-border': '#4A5568',
      'input-focus': '#63B3ED',
      
      // Overlays and Shadows
      overlay: 'rgba(0, 0, 0, 0.75)',
      'shadow-sm': 'rgba(0, 0, 0, 0.2)',
      'shadow-md': 'rgba(0, 0, 0, 0.4)',
      'shadow-lg': 'rgba(0, 0, 0, 0.6)',
      
      // Form Controls
      'control-background': '#2D3748',
      'control-border': '#4A5568',
      'control-text': '#F7FAFC',
      'control-placeholder': '#A0AEC0',
      'control-hover': '#4A5568',
      'control-focus': '#2C5282',
      
      // Tables
      'table-header-background': '#2D3748',
      'table-header-text': '#F7FAFC',
      'table-row-hover': '#4A5568',
      'table-border': '#4A5568',
      'table-cell-background': '#1A202C',
      
      // Marker Components
      'marker-background': '#2D3748',
      'marker-border': '#4A5568',
      'marker-text': '#F7FAFC',
      'marker-hover': '#4A5568',
      'marker-active': '#2C5282',
      'marker-header-background': '#2D3748',
      
      // Action Buttons
      'action-primary-background': '#4299E1',
      'action-primary-text': '#FFFFFF',
      'action-primary-hover': '#3182CE',
      'action-secondary-background': '#2D3748',
      'action-secondary-text': '#F7FAFC',
      'action-secondary-hover': '#4A5568',
      'action-danger-background': '#E53E3E',
      'action-danger-text': '#FFFFFF',
      'action-danger-hover': '#C53030',
      
      // Filters and Search
      'filter-background': '#2D3748',
      'filter-border': '#4A5568',
      'filter-text': '#F7FAFC',
      'filter-placeholder': '#A0AEC0',
      'search-background': '#2D3748',
      'search-border': '#4A5568',
      'search-text': '#F7FAFC',
      'search-placeholder': '#A0AEC0',
      
      // Panels and Sections
      'panel-background': '#1A202C',
      'panel-border': '#2D3748',
      'section-background': '#2D3748',
      'section-border': '#4A5568',
      'section-header-background': '#2D3748',
      'section-header-text': '#F7FAFC',
      
      // Checkboxes and Radio
      'checkbox-background': '#2D3748',
      'checkbox-border': '#4A5568',
      'checkbox-checked': '#4299E1',
      'radio-background': '#2D3748',
      'radio-border': '#4A5568',
      'radio-checked': '#4299E1'
    }
  }
} as const;

// Определяем тип для ключей цветовых схем
export type ColorSchemeKey = keyof typeof colorSchemes;

// Определяем тип для имен цветовых схем (включая пользовательские)
export type ColorSchemeName = ColorSchemeKey | string;

// Определяем тип для ключей цветов
export type ColorKey = keyof typeof colorSchemes.classic.colors;