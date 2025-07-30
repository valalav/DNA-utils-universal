import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Check, ChevronDown, Plus, Settings } from 'lucide-react';
import { colorSchemes, type ColorSchemeName } from '@/config/colorSchemes';
import { selectAppearance, addCustomColorScheme, updateColorScheme } from '@/store/userProfile';
import { CustomSchemeEditor } from './CustomSchemeEditor';
import { useTranslation } from '@/hooks/useTranslation';

const SchemeButton = ({ 
  scheme, 
  schemeKey, 
  isActive, 
  onSelect, 
  onDelete,
  onEdit
}: {
  scheme: { name: string; colors: Record<string, string> };
  schemeKey: string;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) => {
  const { t } = useTranslation();
  
  return (
    <div 
      className={`
        relative px-4 py-2 rounded-lg border transition-all duration-200 cursor-pointer
        ${isActive 
          ? 'border-accent bg-background-tertiary shadow-sm' 
          : 'border-border-light hover:border-border-medium hover:shadow-sm'
        }
      `}
      onClick={onSelect}
    >
      {isActive && (
        <Check className="absolute right-1 top-1 w-3 h-3 text-accent" />
      )}
      
      <div className="flex flex-col gap-1.5 items-center min-w-[60px]">
        <div className="flex gap-1">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: scheme.colors.primary }}
          />
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: scheme.colors.accent }}
          />
        </div>
        <span className="text-xs font-medium">
          {t(`colorSchemes.${schemeKey}`)}
        </span>
      </div>

      {(onDelete || onEdit) && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded-full bg-accent text-white hover:bg-accent/80 transition-colors"
              title={t('common.edit')}
            >
              <Settings className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded-full bg-error text-white hover:bg-error/80 transition-colors"
              title={t('common.delete')}
            >
              <Plus className="w-3 h-3 rotate-45" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const ColorSchemeSelector = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const appearance = useSelector(selectAppearance);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const customSchemes = appearance.customColorSchemes || [];
  const allSchemes = {
    ...colorSchemes,
    ...Object.fromEntries(
      customSchemes.map(scheme => [
        scheme.name,
        { name: scheme.name, colors: scheme.colors }
      ])
    )
  };

  const handleSaveScheme = (colors: Record<string, string>) => {
    if (isEditing) {
      // Обновление существующей схемы
      const updatedSchemes = customSchemes.map(scheme => 
        scheme.name === isEditing ? { ...scheme, colors } : scheme
      );
      dispatch({ type: 'updateCustomColorSchemes', payload: updatedSchemes });
      if (appearance.colorScheme === isEditing) {
        dispatch(updateColorScheme(isEditing));
      }
    } else {
      // Создание новой схемы
      const newSchemeName = `custom_${Date.now()}`;
      dispatch(addCustomColorScheme({
        name: newSchemeName,
        colors
      }));
      dispatch(updateColorScheme(newSchemeName));
    }
    setIsEditing(null);
    setIsCreating(false);
  };

  return (
    <>
      <div className="md:hidden relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg"
        >
          <span className="text-sm">
            {t(`colorSchemes.${appearance.colorScheme}`)}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {isExpanded && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-background-primary border rounded-lg shadow-lg p-2 space-y-1 z-50">
            {Object.entries(allSchemes).map(([key, scheme]) => (
              <button
                key={key}
                onClick={() => {
                  dispatch(updateColorScheme(key as ColorSchemeName));
                  setIsExpanded(false);
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-background-secondary"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: scheme.colors.primary }}
                  />
                  <span className="text-sm">
                    {t(`colorSchemes.${key}`)}
                  </span>
                </div>
              </button>
            ))}
            
            <button
              onClick={() => {
                setIsCreating(true);
                setIsExpanded(false);
              }}
              className="w-full text-left px-2 py-1 rounded hover:bg-background-secondary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">{t('colorSchemes.createCustom')}</span>
            </button>
          </div>
        )}
      </div>

      <div className="hidden md:flex items-center gap-2">
        {Object.entries(allSchemes).map(([key, scheme]) => (
          <SchemeButton
            key={key}
            scheme={scheme}
            schemeKey={key}
            isActive={appearance.colorScheme === key}
            onSelect={() => dispatch(updateColorScheme(key as ColorSchemeName))}
            onEdit={customSchemes.some(s => s.name === key) 
              ? () => setIsEditing(key)
              : undefined}
            onDelete={customSchemes.some(s => s.name === key)
              ? () => dispatch({ type: 'removeCustomColorScheme', payload: key })
              : undefined}
          />
        ))}

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 border rounded-lg hover:bg-background-secondary transition-all"
          title={t('colorSchemes.createCustom')}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {(isEditing || isCreating) && (
        <CustomSchemeEditor
          customColors={isEditing ? allSchemes[isEditing]?.colors : undefined}
          onSave={handleSaveScheme}
          onClose={() => {
            setIsEditing(null);
            setIsCreating(false);
          }}
        />
      )}
    </>
  );
};