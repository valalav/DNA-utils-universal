"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { STRMatch, STRProfile, MarkerCount } from '@/utils/constants';
import { calculateMarkerDifference, calculateMarkerRarity } from '@/utils/calculations';
import type { CalculationMode } from '@/utils/calculations';
import { getOrderedMarkers } from '@/utils/markerSort';  
import { markers, markerGroups, palindromes } from '@/utils/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { ExternalLink } from 'lucide-react';
import { apiClient } from '@/utils/axios';

interface MatchesTableProps {
  matches: STRMatch[];
  query: STRProfile | null;
  onKitNumberClick: (selectedKitNumber: string) => void;
  onRemoveMatch: (matchKitNumber: string) => void;
  onRemoveMarker: (marker: string) => void;
  sortOrder: 'default' | 'mutation_rate';
  selectedMarkerCount: MarkerCount;
  onFindMatches: () => Promise<void>;
  calculationMode: CalculationMode;
}

interface Filters {
  kitNumber: string;
  name: string;
  country: string;
}

interface HaplogroupInfoPopupProps {
  haplogroup: string;
  onClose: () => void;
}

const HaplogroupInfoPopup: React.FC<HaplogroupInfoPopupProps> = ({ haplogroup, onClose }) => {
  const [pathInfo, setPathInfo] = useState<{
    ftdna?: { path: string; url: string };
    yfull?: { path: string; url: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHaplogroupPath = async () => {
      // Счетчик для локальных ручных повторов
      let retryCount = 0;
      const maxRetries = 3;

      const attemptFetch = async () => {
        try {
          setLoading(true);
          setError(null);
          console.log(`Попытка запроса к API (${retryCount+1}/${maxRetries}): /haplogroup-path/${encodeURIComponent(haplogroup)}`);
          
          // Используем fetch напрямую с опцией keepalive для поддержания соединения
          // Axios иногда имеет проблемы с обработкой определенных сетевых ошибок
          const url = `${window.location.origin}/api/haplogroup-path/${encodeURIComponent(haplogroup)}`;
          console.log(`Отправка fetch запроса: ${url}`);
          
          const fetchResponse = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            },
            credentials: 'same-origin',
            keepalive: true,
            signal: AbortSignal.timeout(20000) // 20 секунд таймаут
          });
          
          if (!fetchResponse.ok) {
            throw new Error(`API вернул ошибку: ${fetchResponse.status} ${fetchResponse.statusText}`);
          }
          
          const data = await fetchResponse.json();
          
          if (!data) {
            throw new Error('No haplogroup data found');
          }
          
          console.log('Получен ответ от API:', data);

          setPathInfo({
            ftdna: data.ftdnaDetails ? {
              path: data.ftdnaDetails.path.string,
              url: data.ftdnaDetails.url
            } : undefined,
            yfull: data.yfullDetails ? {
              path: data.yfullDetails.path.string, 
              url: data.yfullDetails.url
            } : undefined
          });
          
          // Сбрасываем счетчик ошибок при успешном запросе
          return true;
        } catch (err) {
          console.error(`Error fetching haplogroup path (attempt ${retryCount+1}/${maxRetries}):`, err);
          
          // Детальная информация об ошибке для разных типов
          let errorMessage = 'Failed to load haplogroup data';
          
          if (err.name === 'AbortError' || err.name === 'TimeoutError') {
            errorMessage = 'Request timeout. The server took too long to respond.';
          } else if (err.message && err.message.includes('API вернул ошибку')) {
            errorMessage = err.message;
          } else if (err.message && err.message.includes('Network Error')) {
            errorMessage = 'Network error. Unable to connect to the haplogroup API server.';
          } else if (err instanceof Error) {
            errorMessage = `${err.message} (${err.name})`;
          } else if (typeof err === 'object' && err !== null) {
            errorMessage = JSON.stringify(err);
          }
          
          setError(errorMessage);
          
          // Если это не последняя попытка, возвращаем false для повторной попытки
          if (retryCount < maxRetries - 1) {
            return false;
          }
          
          // Это была последняя попытка, больше не пробуем
          return true;
        } finally {
          if (retryCount >= maxRetries - 1) {
            setLoading(false);
          }
        }
      };

      // Запускаем попытки запроса с задержкой между неудачными попытками
      while (retryCount < maxRetries) {
        const success = await attemptFetch();
        if (success) break;
        
        // Увеличиваем задержку с каждой попыткой
        retryCount++;
        if (retryCount < maxRetries) {
          const delay = 1000 * Math.pow(2, retryCount - 1); // Экспоненциальная задержка: 1с, 2с, 4с...
          console.log(`Ожидание ${delay}мс перед следующей попыткой...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    if (haplogroup) {
      fetchHaplogroupPath();
    }
    
    // Добавляем очистку при размонтировании
    return () => {
      // Если бы мы использовали cancelToken из axios, здесь можно было бы его отменить
    };
}, [haplogroup]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 relative shadow-2xl border-2 border-white/20 animate-scaleIn" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
        >
          ✕
        </button>
        <h3 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Haplogroup: {haplogroup}</h3>
        
        {loading && <div className="text-center py-4 animate-pulse">Loading...</div>}
        {error && <div className="text-red-500 py-4">{error}</div>}
        
        {pathInfo && (
          <div className="space-y-6">
            {pathInfo.ftdna && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">FTDNA Path:</span>
                  <a
                    href={pathInfo.ftdna.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline transition-all"
                  >
                    View in FTDNA <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/60 p-5 rounded-xl text-sm shadow-inner border border-gray-200/50">
                  {pathInfo.ftdna.path}
                </div>
              </div>
            )}
            
            {pathInfo.yfull && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">YFull Path:</span>
                  <a
                    href={pathInfo.yfull.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 flex items-center gap-1 hover:underline transition-all"
                  >
                    View in YFull <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/60 p-5 rounded-xl text-sm shadow-inner border border-gray-200/50">
                  {pathInfo.yfull.path}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MatchesTable: React.FC<MatchesTableProps> = ({ 
  matches, 
  query, 
  onKitNumberClick, 
  onRemoveMatch, 
  onRemoveMarker,
  sortOrder,
  selectedMarkerCount,
  onFindMatches,
  calculationMode,
}) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Filters>({
    kitNumber: '',
    name: '',
    country: ''
  });
  const [markerFilters, setMarkerFilters] = useState<Record<string, boolean>>({});
  const [selectedHaplogroup, setSelectedHaplogroup] = useState<string | null>(null);

  const getValidMarkersForKit = (markerCount: MarkerCount, sortType: 'default' | 'mutation_rate'): string[] => {
    // Handle GP markers
    if (markerCount === 'GP') {
      return [...markerGroups.GP]; // Spread operator to create a mutable copy
    }

    // Handle numeric marker counts
    const limitMarker = {
      12: 'DYS389ii',
      37: 'DYS438', 
      67: 'DYS565',
      111: 'DYS435'
    }[markerCount];
   
    const baseLimit = markers.indexOf(limitMarker);
    const validMarkers = markers.slice(0, baseLimit + 1);
    
    if (sortType === 'default') {
      return validMarkers;
    } else {
      const sorted = getOrderedMarkers(sortType);
      return sorted.filter(marker => validMarkers.includes(marker));
    }
  };
  
  const orderedMarkers = getValidMarkersForKit(selectedMarkerCount, sortOrder);
  
  const visibleMarkers = orderedMarkers.filter(marker => {
    const queryValue = query?.markers[marker];
    if (!queryValue) return false;
  
    return matches.some(match => {
      const matchValue = match.profile.markers[marker];
      if (!matchValue) return false;
  
      const diff = calculateMarkerDifference(
        queryValue, 
        matchValue, 
        marker,
        marker in palindromes,
        calculationMode
      );
      return diff !== 0;
    });
  });

  const filteredMatches = matches.filter(match => {
    const kitMatch = match.profile.kitNumber.toLowerCase().includes(filters.kitNumber.toLowerCase());
    const nameMatch = (match.profile.name || '').toLowerCase().includes(filters.name.toLowerCase());
    const countryMatch = (match.profile.country || '').toLowerCase().includes(filters.country.toLowerCase());
    
    const markerMatch = Object.entries(markerFilters).every(([marker, isChecked]) => {
      if (!isChecked) return true;

      const queryValue = query?.markers[marker];
      const matchValue = match.profile.markers[marker];

      if (!queryValue || !matchValue) return false;

      const diff = calculateMarkerDifference(
        queryValue,
        matchValue,
        marker,
        marker in palindromes,
        calculationMode
      );

      return diff === 0;
    });
    
    return kitMatch && nameMatch && countryMatch && markerMatch;
  });

  // Cache marker rarity calculations
  const markerRarityCache = useMemo(() => {
    const cache: Record<string, Record<string, { rarity: number; rarityStyle?: React.CSSProperties }>> = {};
    
    orderedMarkers.forEach(marker => {
      cache[marker] = {};
      
      if (!query?.markers[marker]) return;
      
      const queryValue = query.markers[marker];
      matches.forEach(match => {
        const matchValue = match.profile.markers[marker];
        if (!matchValue) return;
        
        const result = calculateMarkerRarity(matches, marker, matchValue, queryValue);
        cache[marker][matchValue] = result;
      });
    });
    
    return cache;
  }, [matches, query, orderedMarkers]);

  const getRarityStyle = useCallback((marker: string, value: string) => {
    return markerRarityCache[marker]?.[value]?.rarityStyle;
  }, [markerRarityCache]);

  const renderMarkerCell = (
    marker: string,
    queryValue: string | undefined,
    matchValue: string | undefined
  ) => {
    if (!queryValue || !matchValue) {
      return <td key={marker} className="border border-border-light p-0 w-8 h-8"></td>;
    }

    const diff = calculateMarkerDifference(queryValue, matchValue, marker, marker in palindromes, calculationMode);
    const { rarityStyle } = calculateMarkerRarity(matches, marker, matchValue, queryValue);

    return (
      <td key={marker} className="border border-border-light p-0 w-8 h-8">
        <div 
          style={rarityStyle}
          className="flex items-center justify-center h-full w-full"
          title={`${marker}: ${matchValue}`}
        >
          {diff !== 0 && !isNaN(diff) && (
            <span className={
              diff === 1 ? 'text-diff-1' : 
              diff === 2 ? 'text-diff-2' : 
                         'text-diff-3'
            }>
              {diff > 0 ? `+${diff}` : diff}
            </span>
          )}
        </div>
      </td>
    );
  };

  if (!matches.length || !query) return null;

  return (
    <>
      <div className="mb-6 flex justify-between items-center gap-6">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('filters.kit_number')}
              value={filters.kitNumber}
              onChange={e => setFilters(prev => ({ ...prev, kitNumber: e.target.value }))}
              className="p-3 pl-10 border-2 w-full rounded-xl bg-background-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-md hover:shadow-lg"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              #
            </span>
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('filters.name')}
              value={filters.name}
              onChange={e => setFilters(prev => ({ ...prev, name: e.target.value }))}
              className="p-3 pl-10 border-2 w-full rounded-xl bg-background-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-md hover:shadow-lg"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              @
            </span>
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('filters.country')}
              value={filters.country}
              onChange={e => setFilters(prev => ({ ...prev, country: e.target.value }))}
              className="p-3 pl-10 border-2 w-full rounded-xl bg-background-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-md hover:shadow-lg"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🌍
            </span>
          </div>
        </div>
        <button
          onClick={onFindMatches}
          className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:translate-y-[-2px] transition-all shadow-md hover:shadow-lg font-bold min-w-[150px]"
        >
          {t('search.button')}
        </button>
      </div>

      <table className="table-primary border-collapse shadow-xl rounded-2xl overflow-hidden border border-gray-200/60">
        <thead>
          <tr className="h-10">
            <th className="border border-border-medium p-1"></th>
            <th className="border border-border-medium p-1">
              <input
                type="text"
                className="input-primary text-xs w-full"
                placeholder={t('table.filterKit')}
                value={filters.kitNumber}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  kitNumber: e.target.value
                }))}
              />
            </th>
            <th className="border border-border-medium p-1">
              <input
                type="text"
                className="input-primary text-xs w-full"
                placeholder={t('table.filterName')}
                value={filters.name}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
              />
            </th>
            <th className="border border-border-medium p-1">
              <input
                type="text"
                className="input-primary text-xs w-full"
                placeholder={t('table.filterCountry')}
                value={filters.country}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  country: e.target.value
                }))}
              />
            </th>
            <th className="border border-border-medium p-1" colSpan={4}></th>
            {visibleMarkers.map(marker => (
              <th key={marker} className="border border-border-medium p-1 w-6">
                <input
                  type="checkbox"
                  className="w-3 h-3 accent-primary"
                  checked={markerFilters[marker] || false}
                  onChange={(e) => setMarkerFilters(prev => ({
                    ...prev,
                    [marker]: e.target.checked
                  }))}
                />
              </th>
            ))}
          </tr>
          <tr className="bg-background-secondary h-24">
            <th className="border border-border-medium p-2 w-8 min-w-[2rem] max-w-[2rem]">-</th>
            <th className="border border-border-medium p-2 w-24 min-w-[6rem] max-w-[6rem]">{t('table.kit')}</th>
            <th className="border border-border-medium p-2 w-40 min-w-[10rem] max-w-[10rem] bg-background-tertiary/50">{t('table.name')}</th>
            <th className="border border-border-medium p-2 w-32 min-w-[8rem] max-w-[8rem] bg-background-tertiary/50">{t('table.country')}</th>
            <th className="border border-border-medium p-2 w-32 min-w-[8rem] max-w-[8rem] bg-background-tertiary/50">{t('table.haplo')}</th>
            <th className="border border-border-medium p-2 w-16 min-w-[4rem] max-w-[4rem] bg-background-tertiary/50">{t('table.gd')}</th>
            <th className="border border-border-medium p-2 w-16 min-w-[4rem] max-w-[4rem] bg-background-tertiary/50">{t('table.str')}</th>
            <th className="border border-border-medium p-2 w-16 min-w-[4rem] max-w-[4rem] bg-background-tertiary/50">{t('table.percent')}</th>
            {visibleMarkers.map(marker => (
              <th key={marker} className="p-0 border border-border-medium w-6 relative">
                <div className="h-24">
                  <button 
                    onClick={() => onRemoveMarker(marker)} 
                    className="absolute -top-1 right-1 text-error hover:text-error/80 transition-colors" 
                    title={t('table.removeMarker', { marker })}
                  >×</button>
                  <div 
                    className="absolute -rotate-90 origin-left whitespace-nowrap text-sm font-bold text-black" 
                    style={{left: '50%', bottom: '8px'}}
                  >{marker}</div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-background-tertiary h-8 leading-none">
            <td className="border border-border-light p-2 leading-none w-8 min-w-[2rem] max-w-[2rem]"></td>
            <td className="border border-border-light p-2 font-bold text-text-primary leading-none w-24 min-w-[6rem] max-w-[6rem] truncate" title={query.kitNumber}>{query.kitNumber}</td>
            <td className="border border-border-light p-2 font-semibold text-text-primary leading-none w-40 min-w-[10rem] max-w-[10rem] truncate" title={query.name || "-"}>{query.name || "-"}</td>
            <td className="border border-border-light p-2 font-semibold text-text-primary leading-none w-32 min-w-[8rem] max-w-[8rem] truncate" title={query.country || "-"}>{query.country || "-"}</td>
            <td className="border border-border-light p-2 font-semibold text-text-primary leading-none w-32 min-w-[8rem] max-w-[8rem] truncate" title={query.haplogroup || "-"}>
              {query.haplogroup ? (
                <button
                  onClick={() => setSelectedHaplogroup(query.haplogroup || null)}
                  className="text-accent hover:text-accent/80 transition-colors"
                >
                  {query.haplogroup}
                </button>
              ) : "-"}
            </td>
            <td className="border border-border-light p-2 text-center font-semibold text-text-primary leading-none">-</td>
            <td className="border border-border-light p-2 text-center font-semibold text-text-primary leading-none">-</td>
            <td className="border border-border-light p-2 text-center font-semibold text-text-primary leading-none">-</td>
            {visibleMarkers.map(marker => (
              <td key={marker} className="border border-border-light p-0 w-6 h-8 leading-none">
                <div 
                  className="flex items-center justify-center h-full w-6 overflow-hidden text-ellipsis"
                  title={query.markers[marker] || ''}
                >
                  <span className="truncate max-w-[1.5rem]">{query.markers[marker] || ''}</span>
                </div>
              </td>
            ))}
          </tr>
          {filteredMatches.map((matchItem, index) => (
            <tr 
              key={`${matchItem.profile.kitNumber}-${index}`}
              className="hover:bg-background-tertiary transition-colors h-8"
            >
              <td className="border border-border-light p-2 w-8 min-w-[2rem] max-w-[2rem]">
                <button
                  onClick={() => onRemoveMatch(matchItem.profile.kitNumber)}
                  className="text-error hover:text-error/80 transition-colors"
                  title={t('common.remove')}
                >×</button>
              </td>
              <td className="border border-border-light p-2 w-24 min-w-[6rem] max-w-[6rem] truncate" title={matchItem.profile.kitNumber}>
                <button
                  onClick={() => onKitNumberClick(matchItem.profile.kitNumber)}
                  className="text-accent hover:text-accent/80 transition-colors font-bold truncate"
                >{matchItem.profile.kitNumber}</button>
              </td>
              <td className="border border-border-light p-2 font-semibold text-text-primary w-40 min-w-[10rem] max-w-[10rem] truncate" title={matchItem.profile.name || "-"}>
                {matchItem.profile.name || "-"}
              </td>
              <td className="border border-border-light p-2 font-semibold text-text-primary w-32 min-w-[8rem] max-w-[8rem] truncate" title={matchItem.profile.country || "-"}>
                {matchItem.profile.country || "-"}
              </td>
              <td className="border border-border-light p-2 font-semibold text-text-primary w-32 min-w-[8rem] max-w-[8rem] truncate" title={matchItem.profile.haplogroup || "-"}>
                {matchItem.profile.haplogroup ? (
                  <button
                    onClick={() => setSelectedHaplogroup(matchItem.profile.haplogroup || null)}
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    {matchItem.profile.haplogroup}
                  </button>
                ) : "-"}
              </td>
              <td className="border border-border-light p-2 text-center font-semibold text-text-primary">
                {Math.round(matchItem.distance)}
              </td>
              <td className="border border-border-light p-2 text-center font-semibold text-text-primary">
                {matchItem.comparedMarkers}
              </td>
              <td className="border border-border-light p-2 text-center font-semibold text-text-primary">
                {matchItem.percentIdentical.toFixed(1)}
              </td>
              {visibleMarkers.map(marker => {
                const queryValue = query.markers[marker];
                const matchValue = matchItem.profile.markers[marker];

                if (!queryValue || !matchValue) {
                  return <td key={marker} className="border border-border-light p-0 w-6 h-8"></td>;
                }

                const diff = calculateMarkerDifference(queryValue, matchValue, marker, marker in palindromes, calculationMode);
                const rarityStyle = getRarityStyle(marker, matchValue);

                return (
                  <td key={marker} className="border border-border-light p-0 w-6 h-8">
                    <div 
                      style={rarityStyle}
                      className="flex items-center justify-center h-full w-6 overflow-hidden"
                      title={matchValue}
                    >
                      {!isNaN(diff) && diff > 0 && (
                        <span className={
                          diff === 1 ? 'text-diff-1' : 
                          diff === 2 ? 'text-diff-2' : 
                          'text-diff-3'
                        }>
                          {
                            Number(matchValue) > Number(queryValue) 
                              ? `+${diff}` 
                              : `-${diff}`
                          }
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selectedHaplogroup && (
        <HaplogroupInfoPopup
          haplogroup={selectedHaplogroup}
          onClose={() => setSelectedHaplogroup(null)}
        />
      )}
    </>
  );
};

export default MatchesTable;