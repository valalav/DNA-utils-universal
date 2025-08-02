"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Filter, Download, Trash2 } from 'lucide-react';
import type { STRProfile } from '@/utils/constants';
// Basic form controls implementation
const FormControls = {
  Input: ({ placeholder, value, onChange, startIcon, title }: any) => (
    <div className="relative">
      {startIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{startIcon}</span>}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 py-2 border rounded-md"
        aria-label={placeholder}
        title={title || placeholder}
      />
    </div>
  ),
  Checkbox: ({ checked, onChange, title }: any) => (
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4"
        title={title}
      />
      <span className="sr-only">{title}</span>
    </label>
  )
};
import { dbManager } from '@/utils/storage/indexedDB';

interface ProfilesManagerProps {
  profiles: STRProfile[];
  onProfilesUpdate: (profiles: STRProfile[]) => void;
  onProfileSelect: (profile: STRProfile) => void;
}

const ProfilesManager = React.memo(({
  profiles,
  onProfilesUpdate,
  onProfileSelect
}: ProfilesManagerProps) => {
  // Состояния фильтров
  const [filters, setFilters] = useState({
    kitNumber: '',
    haplogroup: '',
    country: ''
  });

  // Состояния для визуализации
  const [visibleProfiles, setVisibleProfiles] = useState<STRProfile[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());

  // Загрузка профилей порциями
  useEffect(() => {
    if (profiles.length > 0) {
      console.log('Начало отображения профилей');
      // Показываем первые 100 сразу
      setVisibleProfiles(profiles.slice(0, 100));
      
      // Остальные добавляем через setTimeout
      if (profiles.length > 100) {
        setTimeout(() => {
          console.log('Загрузка всех профилей');
          setVisibleProfiles(profiles);
        }, 100);
      }
    }
  }, [profiles]);

  // Фильтрация профилей
  const filteredProfiles = visibleProfiles.filter(profile => {
    return (
      profile.kitNumber.toLowerCase().includes(filters.kitNumber.toLowerCase()) &&
      (!filters.haplogroup || profile.haplogroup?.startsWith(filters.haplogroup)) &&
      (!filters.country || profile.country?.toLowerCase().includes(filters.country.toLowerCase()))
    );
  });

  // Обработчики
  const handleExport = useCallback(() => {
    const selectedData = filteredProfiles.filter(p => selectedProfiles.has(p.kitNumber));
    const data = selectedData.length > 0 ? selectedData : filteredProfiles;
    
    const csv = [
      ['Kit Number', 'Name', 'Country', 'Haplogroup', ...Object.keys(data[0].markers)].join(','),
      ...data.map(profile => [
        profile.kitNumber,
        profile.name || '',
        profile.country || '',
        profile.haplogroup || '',
        ...Object.values(profile.markers)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'str_profiles.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredProfiles, selectedProfiles]);

  // Рендер
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Loaded Profiles ({profiles.length})</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              title="Export Profiles"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                await dbManager.clearProfiles();
                onProfilesUpdate([]);
              }}
              className="p-2 text-error hover:text-error/80 transition-colors"
              title="Clear Database"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormControls.Input
              placeholder="Search by Kit Number"
              value={filters.kitNumber}
              onChange={(e) => setFilters(prev => ({ ...prev, kitNumber: e.target.value }))}
              startIcon={<Search className="w-4 h-4" />}
            />
            <FormControls.Input
              placeholder="Filter by Haplogroup"
              value={filters.haplogroup}
              onChange={(e) => setFilters(prev => ({ ...prev, haplogroup: e.target.value }))}
              startIcon={<Filter className="w-4 h-4" />}
            />
            <FormControls.Input
              placeholder="Filter by Country"
              value={filters.country}
              onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
              startIcon={<Filter className="w-4 h-4" />}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 w-4">
                    <FormControls.Checkbox
                      checked={selectedProfiles.size === filteredProfiles.length}
                      onChange={(e) => {
                        setSelectedProfiles(new Set(
                          e.target.checked ? filteredProfiles.map(p => p.kitNumber) : []
                        ));
                      }}
                    />
                  </th>
                  <th className="pb-2">Kit Number</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Country</th>
                  <th className="pb-2">Haplogroup</th>
                  <th className="pb-2">Markers</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map(profile => (
                  <tr
                    key={profile.kitNumber}
                    onClick={() => onProfileSelect(profile)}
                    className="border-t border-border-light hover:bg-background-secondary transition-colors cursor-pointer"
                  >
                    <td>
                      <FormControls.Checkbox
                        checked={selectedProfiles.has(profile.kitNumber)}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedProfiles(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              next.add(profile.kitNumber);
                            } else {
                              next.delete(profile.kitNumber);
                            }
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td>{profile.kitNumber}</td>
                    <td>{profile.name || '-'}</td>
                    <td>{profile.country || '-'}</td>
                    <td>
                      {profile.haplogroup ? (
                        <a
                          href={`https://www.yfull.com/tree/${profile.haplogroup}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-accent hover:text-accent/80 transition-colors"
                        >
                          {profile.haplogroup}
                        </a>
                      ) : '-'}
                    </td>
                    <td>{Object.keys(profile.markers).length} markers</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ProfilesManager.displayName = 'ProfilesManager';

export default ProfilesManager;