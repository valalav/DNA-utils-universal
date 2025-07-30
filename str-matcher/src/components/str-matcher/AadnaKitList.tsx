"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_REPOS } from '@/config/repositories.config';
import { parseCSVData } from '@/utils/dataProcessing';
import type { STRProfile } from '@/utils/constants';
import { ScrollArea } from '@/components/ui';

interface AadnaKitListProps {
  onKitNumberClick: (kitNumber: string) => void;
}

const AadnaKitList: React.FC<AadnaKitListProps> = ({ onKitNumberClick }) => {
  const { t } = useTranslation();
  const [kits, setKits] = useState<STRProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAadnaKits = async () => {
      setLoading(true);
      setError(null);
      const aadnaRepo = DEFAULT_REPOS.find(repo => repo.id === 'aadna');

      if (!aadnaRepo || !aadnaRepo.url) {
        setError('AADNA repository configuration not found.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(aadnaRepo.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const csvData = await response.text();
        const profiles = await parseCSVData(csvData);
        setKits(profiles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAadnaKits();
  }, []);

  const filteredKits = useMemo(() => {
    return kits.filter(kit =>
      kit.kitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kit.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [kits, searchTerm]);

  return (
    <Collapsible title={t('aadna.kitsTitle')} defaultOpen={true} key="aadna-kit-list">
      <div className="space-y-2">
        <Input
          placeholder={t('common.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8"
        />
        <ScrollArea className="h-[576px] w-full rounded-md border">
          <div className="p-4">
            {loading && <p>{t('common.loading')}...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && (
              <div className="space-y-2">
                {filteredKits.map((kit, index) => (
                  <div
                    key={`${kit.kitNumber}-${index}`}
                    className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors shadow-sm hover:shadow-md border border-transparent hover:border-gray-200"
                    onClick={() => onKitNumberClick(kit.kitNumber)}
                  >
                    <div>
                      <div className="font-medium text-primary">{kit.kitNumber}</div>
                      <div className="text-sm text-gray-500">{kit.name || '-'}</div>
                    </div>
                    <div className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{kit.haplogroup || '-'}</div>
                  </div>
                ))}
                {kits.length === 0 && !loading && (
                  <p>{t('aadna.noKitsFound')}</p>
                )}
                {filteredKits.length === 0 && kits.length > 0 && (
                  <p>{t('search.noResults')}</p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Collapsible>
  );
};

export default AadnaKitList;