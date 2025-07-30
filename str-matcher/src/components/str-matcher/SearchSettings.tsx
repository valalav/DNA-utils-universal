import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { markerGroups } from '@/utils/constants';
import type { MarkerCount } from '@/utils/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { Collapsible } from '@/components/ui/collapsible';
import type { CalculationMode } from '@/utils/calculations';

interface SearchSettingsProps {
  id?: string;
  kitNumber: string;
  setKitNumber: (value: string) => void;
  maxDistance: number;
  setMaxDistance: (value: number) => void;
  maxMatches: number;
  setMaxMatches: (value: number) => void;
  markerCount: MarkerCount;
  setMarkerCount: (value: MarkerCount) => void;
  markerSortOrder: 'default' | 'mutation_rate';
  setMarkerSortOrder: (value: 'default' | 'mutation_rate') => void;
  onPopulateMarkers: () => void;
  onReset: () => void;
  onSearch: () => void;
  onClearDatabase: () => void;
  onExportDatabase: () => void;
  loading: boolean;
  disabled: boolean;
  databaseSize: number;
  calculationMode: CalculationMode;
  setCalculationMode: (mode: CalculationMode) => void;
}

export const SearchSettings: React.FC<SearchSettingsProps> = ({
  id,
  kitNumber,
  setKitNumber,
  maxDistance,
  setMaxDistance,
  maxMatches,
  setMaxMatches,
  markerCount,
  setMarkerCount,
  markerSortOrder,
  setMarkerSortOrder,
  onPopulateMarkers,
  onReset,
  onSearch,
  loading,
  disabled,
  databaseSize,
  onClearDatabase,
  onExportDatabase,
  calculationMode,
  setCalculationMode
}) => {
  const { t } = useTranslation();

  return (
    <Card className="shadow-xl">
      <CardContent className="space-y-6 p-6">
        <div className="bg-gradient-to-r from-background-secondary to-background-tertiary/50 p-4 rounded-xl shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-text-secondary">
              {t('database.loadedProfiles')}:
            </span>
            <span className="text-lg font-bold text-primary bg-white px-3 py-1 rounded-full shadow-sm">
              {databaseSize.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              {t('search.kitNumber')}
            </label>
            <input
              type="text"
              value={kitNumber}
              onChange={(e) => setKitNumber(e.target.value)}
              className="w-full p-3 border-2 rounded-xl bg-background-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
              placeholder="IN12345"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              {t('search.maxDistance')}
            </label>
            <input
              type="number"
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full p-3 border-2 rounded-xl bg-background-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
              min={0}
              max={100}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              {t('search.maxMatches')}
            </label>
            <input
              type="number"
              value={maxMatches}
              onChange={(e) => setMaxMatches(Number(e.target.value))}
              className="w-full p-3 border-2 rounded-xl bg-background-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
              min={1}
              max={1000}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              {t('search.markerCount')}
            </label>
            <select 
              value={String(markerCount)}
              onChange={(e) => {
                const value = e.target.value;
                const newValue = /^\d+$/.test(value) ? Number(value) : value;
                setMarkerCount(newValue as MarkerCount);
              }}
              className="w-full p-3 border-2 rounded-xl bg-background-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
            >
              {Object.entries(markerGroups).map(([count]) => (
                <option key={count} value={count}>
                  {t('markers.counts.' + count)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              {t('search.sortOrder')}
            </label>
            <select
              value={markerSortOrder}
              onChange={(e) => setMarkerSortOrder(e.target.value as 'default' | 'mutation_rate')}
              className="w-full p-3 border-2 rounded-xl bg-background-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
            >
              <option value="default">{t('search.sortOptions.default')}</option>
              <option value="mutation_rate">{t('search.sortOptions.mutation_rate')}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              {t('search.calculationMode')}
            </label>
            <select
              value={calculationMode.type}
              onChange={(e) => setCalculationMode({ type: e.target.value as 'standard' | 'extended' })}
              className="w-full p-3 border-2 rounded-xl bg-background-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
            >
              <option value="standard">{t('search.calculationModes.standard')}</option>
              <option value="extended">{t('search.calculationModes.extended')}</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={onPopulateMarkers}
              className="px-5 py-3 bg-gradient-to-r from-accent to-accent/80 text-white rounded-xl hover:translate-y-[-2px] transition-all shadow-md hover:shadow-lg font-bold"
            >
              {t('common.buttonText.populateMarkers')}
            </button>

            <button
              onClick={onExportDatabase}
              disabled={databaseSize === 0}
              className="px-5 py-3 bg-gradient-to-r from-accent to-accent/80 text-white rounded-xl hover:translate-y-[-2px] disabled:opacity-50 disabled:hover:translate-y-0 transition-all shadow-md hover:shadow-lg font-bold"
            >
              Выгрузить базу ({databaseSize})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onReset}
              className="px-5 py-3 bg-gradient-to-r from-secondary to-secondary/80 text-white rounded-xl hover:translate-y-[-2px] transition-all shadow-md hover:shadow-lg font-bold"
            >
              {t('search.resetSettings')}
            </button>
            
            <button
              onClick={onClearDatabase}
              disabled={databaseSize === 0}
              className="px-5 py-3 bg-gradient-to-r from-destructive to-destructive/80 text-white rounded-xl hover:translate-y-[-2px] disabled:opacity-50 disabled:hover:translate-y-0 transition-all shadow-md hover:shadow-lg font-bold"
            >
              {t('database.clear')} ({databaseSize})
            </button>
            
            <button
              onClick={onSearch}
              disabled={disabled || loading}
              className="px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:translate-y-[-2px] disabled:opacity-50 disabled:hover:translate-y-0 transition-all shadow-md hover:shadow-lg font-bold min-w-[120px]"
            >
              {loading ? t('search.searching') : t('search.button')}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 