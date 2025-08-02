"use client";

import React, { useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent } from '@/components/ui/card';
import { parseCSVData } from '../../utils/csvParser';
import type { STRProfile } from '@/utils/constants';
import { dbManager } from '@/utils/storage/indexedDB';

interface DatabaseInputProps {
  onDataLoaded: (profiles: STRProfile[]) => void;
  onError: (error: string) => void;
  recordCount: number;
}

const DatabaseInput: React.FC<DatabaseInputProps> = ({ onDataLoaded, onError, recordCount }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleTextInput = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    try {
      setLoading(true);
      const profiles = await parseCSVData(text);
      
      // 🔄 НАКОПИТЕЛЬНОЕ СОХРАНЕНИЕ: используем новый метод mergeProfiles
      await dbManager.mergeProfiles(profiles);
      
      // Передаем только новые профили для добавления в память
      onDataLoaded(profiles);
    } catch (error) {
      console.error('Error parsing CSV data:', error);
      onError(error instanceof Error ? error.message : 'Failed to parse CSV data');
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded, onError]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      await handleTextInput(text);
    } catch (error) {
      console.error('Error reading file:', error);
      onError(error instanceof Error ? error.message : 'Failed to read file');
    } finally {
      setLoading(false);
      // Очищаем input для возможности повторной загрузки того же файла
      event.target.value = '';
    }
  }, [handleTextInput, onError]);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <textarea
              className="w-full h-32 p-2 border rounded-md bg-background-primary resize-none"
              placeholder={t('database.pasteOrDrop')}
              onBlur={(e) => handleTextInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="inline-block px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              {t('database.uploadCSV')}
            </label>
            <div className="text-sm text-text-secondary text-center">
              {loading ? t('database.loadingData') : (
                recordCount > 0 ? t('database.profilesInDatabase', { count: recordCount }) : t('database.databaseEmpty')
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseInput;