"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible } from '@/components/ui/collapsible';
import { AppHeader } from '@/components/layout/AppHeader';
import STRMarkerGrid from './STRMarkerGrid';
import MatchesTable from './MatchesTable';
import DataRepositories from './DataRepositories';
import { useTranslation } from '@/hooks/useTranslation';
import DatabaseInput from './DatabaseInput';
import { useSTRMatcher } from '@/hooks/useSTRMatcher';
import { markerOperations } from '@/utils/markerOperations';
import { SearchSettings } from './SearchSettings';
import type { STRMatch, STRProfile } from '@/utils/constants';
import type { HaplogroupFilterState } from '@/types/haplogroup';
import { useHaplogroups } from '@/hooks/useHaplogroups';
import { HaplogroupFilter } from './HaplogroupFilter';
import debounce from 'lodash/debounce';
import { Checkbox } from '@/components/ui/checkbox';
import AadnaKitList from './AadnaKitList';
import type { MarkerCount } from '@/utils/constants';
import { Match, Filters } from '../../types';
import { processMatches } from '../../utils/calculations';
import type { CalculationMode } from '@/utils/calculations';
import { calculateGeneticDistance } from '@/utils/calculations';
import { markers } from '@/utils/constants';

interface STRMatcherState {
  // ... существующие поля
  haplogroupFilter: HaplogroupFilterState;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const STRMatcher: React.FC = () => {
  const { t } = useTranslation();
  
  // 🔄 УПРОЩЕННЫЕ состояния из useSTRMatcher
  const {
    database, // 🔄 Простой массив в памяти
    totalProfiles, // 🔄 Вычисляется из database.length
    processingProgress, // ⚡ Прогресс обработки
    processedCount, // ⚡ Количество обработанных
    foundCount, // ⚡ Количество найденных
    currentBatch, // ⚡ Текущий batch
    totalBatches, // ⚡ Общее количество batch'ей
    setDatabase,
    mergeDatabase, // 🔄 НОВАЯ ФУНКЦИЯ для накопительной загрузки
    query,
    setQuery,
    matches: strMatches, // переименовываем для избежания конфликта
    setMatches: setStrMatches, // переименовываем для избежания конфликта
    loading,
    setLoading, // добавляем setLoading из хука
    kitNumber,
    setKitNumber,
    searchHistory,
    setSearchHistory,
    error,
    setError,
    markerCount,
    setMarkerCount,
    maxDistance,
    setMaxDistance,
    maxMatches,
    setMaxMatches,
    markerSortOrder,
    setMarkerSortOrder,
    handleFindMatches,
    calculationMode,
    setCalculationMode
  } = useSTRMatcher();

  // Устанавливаем значение по умолчанию для kitNumber
  useEffect(() => {
    if (!kitNumber) {
      setKitNumber('39626');
    }
  }, [kitNumber, setKitNumber]);

  // Упрощенные состояния для фильтрации гаплогрупп
  const [haplogroupFilteredMatches, setHaplogroupFilteredMatches] = useState<STRMatch[]>([]);

  // Добавляем состояние для скрытых маркеров
  const [hiddenMarkers, setHiddenMarkers] = useState<Set<string>>(new Set());

  const {
    filterHaplogroup,
    setFilterHaplogroup,
    includeSubclades,
    setIncludeSubclades,
    showEmptyHaplogroups,
    setShowEmptyHaplogroups,
    checkHaplogroupMatch
  } = useHaplogroups();

  // Добавим состояние для отслеживания активности фильтра
  const [isFilterActive, setIsFilterActive] = useState(false);

  // 🔄 УПРОЩЕНИЕ: Убираем автозагрузку сохраненных профилей
  // База данных теперь пустая при запуске - пользователь загружает CSV файлы вручную

  // 🔄 УПРОЩЕННОЕ удаление совпадения
  const handleRemoveMatch = useCallback(async (matchKitNumber: string) => {
    try {
      // 🔄 Удаляем из массива в памяти и из матчей
      setDatabase(prev => prev.filter(p => p.kitNumber !== matchKitNumber));
      setStrMatches(prev => prev.filter(m => m.profile.kitNumber !== matchKitNumber));
      setHaplogroupFilteredMatches(prev => prev.filter(m => m.profile.kitNumber !== matchKitNumber));
      
      console.log(`🗑️ Профиль ${matchKitNumber} удален из базы и результатов`);
    } catch (error) {
      console.error('❌ Ошибка удаления профиля:', error);
    }
  }, [setDatabase, setStrMatches, setHaplogroupFilteredMatches]);

  // Обновляем функцию handleRemoveMarker
  const handleRemoveMarker = useCallback((marker: string) => {
    if (query) {
      // Сначала добавляем маркер в список скрытых
      setHiddenMarkers(prev => new Set([...prev, marker]));
      
      // Создаем новый объект маркеров без скрытого маркера
      const { updatedQuery, updatedDatabase } = markerOperations.hideMarker(query, marker, database);
      if (updatedQuery) {
        setQuery(updatedQuery);
        setDatabase(updatedDatabase);
        
        // Заново пересчитываем все матчи с новым набором маркеров
        // Используем текущие матчи и пересчитываем ГД для каждого
        setStrMatches(strMatches.map(match => {
          const result = calculateGeneticDistance(
            updatedQuery.markers,
            match.profile.markers,
            markerCount,
            calculationMode
          );

          return {
            ...match,
            ...result
          };
        })
        // Отфильтровываем те, что теперь превышают максимальную дистанцию
        .filter(match => match.distance <= maxDistance)
        // Сортируем по возрастанию ГД
        .sort((a, b) => a.distance - b.distance)
        // Ограничиваем количество результатов
        .slice(0, maxMatches));
      }
    }
  }, [
    query,
    database,
    setQuery,
    setDatabase,
    strMatches,
    setStrMatches,
    markerCount,
    calculationMode,
    maxDistance,
    maxMatches
  ]);

  // Обновляем функцию populateFromKitNumber
  // 🔄 УПРОЩЕННАЯ функция populateFromKitNumber
  const populateFromKitNumber = useCallback(async (selectedKitNumber: string) => {
    if (!selectedKitNumber || !totalProfiles) return;

    try {
      // 🔄 УПРОЩЕНИЕ: ищем профиль в массиве, а не в IndexedDB
      const selectedProfile = database.find(profile => profile.kitNumber === selectedKitNumber);
      if (!selectedProfile) {
        console.warn(`Профиль ${selectedKitNumber} не найден в базе`);
        return;
      }

      setKitNumber(selectedKitNumber);
      
      // Очищаем список скрытых маркеров при заполнении
      setHiddenMarkers(new Set());
      
      // Создаем полный профиль со всеми маркерами
      const fullProfile = {
        ...selectedProfile,
        markers: { ...selectedProfile.markers }
      };
      
      setQuery(fullProfile);

      if (!searchHistory.some(item => item.kitNumber === selectedKitNumber)) {
        setSearchHistory(prev => [{
          kitNumber: selectedProfile.kitNumber,
          name: selectedProfile.name,
          haplogroup: selectedProfile.haplogroup,
          markers: selectedProfile.markers,
        timestamp: new Date()
      }, ...prev].slice(0, 10));
    }

    setTimeout(() => {
      handleFindMatches();
    }, 100);
    
    markerOperations.populateMarkerInputs(fullProfile);
    } catch (error) {
      console.error('❌ Ошибка получения профиля:', error);
      setError('Ошибка получения профиля из массива');
    }
  }, [database, searchHistory, setKitNumber, setQuery, setSearchHistory, setError, handleFindMatches, totalProfiles]);

  // Сброс маркеров
  const resetMarkers = () => {
    markerOperations.resetMarkers();
    setQuery(null);
    setStrMatches([]);
    setKitNumber('');
  };

  // ⚡ ОБНОВЛЕННАЯ функция поиска - использует оптимизированный handleFindMatches
  const handleSearch = useCallback(async () => {
    if (!query || Object.keys(query.markers).length === 0) {
      setStrMatches([]); // Очищаем результаты если нет маркеров
      return;
    }

    // ⚡ Используем новую оптимизированную функцию вместо старой логики
    await handleFindMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, handleFindMatches]);

  // Создаем дебаунсированную версию поиска совпадений
  const debouncedFindMatches = useMemo(
    () => debounce(() => {
      if (query && Object.keys(query.markers).length > 0) {
        handleFindMatches();
      }
    }, 300),
    [query, handleFindMatches]
  );

  // Очистка таймера дебаунса при размонтировании
  useEffect(() => {
    return () => {
      debouncedFindMatches.cancel();
    };
  }, [debouncedFindMatches]);

  // Обработчик изменения значения маркера
  const handleMarkerChange = useCallback((marker: string, value: string) => {
    const updatedQuery = markerOperations.updateMarkerValue(query, marker, value);
    if (updatedQuery) {
      setQuery(updatedQuery);
      debouncedFindMatches(); // Используем дебаунсированный поиск
    }
  }, [query, debouncedFindMatches, setQuery]);

  const handleReset = () => {
    resetMarkers();
    setMaxDistance(25);
    setMaxMatches(200);
    setMarkerCount(37);
    setMarkerSortOrder('mutation_rate');
  };

  // Добавляем новую функцию для сброса базы данных
  const handleClearDatabase = () => {
    setDatabase([]);
    setStrMatches([]);
    setError(null);
  };

  // 🔄 УПРОЩЕННАЯ ОПТИМИЗИРОВАННАЯ логика фильтрации гаплогрупп
  const handleApplyFilter = useCallback(async () => {
    if (!filterHaplogroup || !strMatches.length) {
      setIsFilterActive(false);
      setHaplogroupFilteredMatches(strMatches);
      return;
    }

    setIsFilterActive(true);
    setLoading(true);

    try {
      if (includeSubclades) {
        // Используем оптимизированный batch API для проверки субкладов
        const uniqueHaplogroups = Array.from(new Set(
          strMatches
            .map(match => match.profile?.haplogroup)
            .filter((haplogroup): haplogroup is string => Boolean(haplogroup))
        ));

        if (uniqueHaplogroups.length === 0) {
          setHaplogroupFilteredMatches(showEmptyHaplogroups ? strMatches : []);
          return;
        }

        // Конвертируем в формат для batch API
        const matchesForFilter: Match[] = strMatches.map(match => ({
          id: match.profile.kitNumber,
          name: match.profile.name || '',
          haplogroup: match.profile.haplogroup,
          markers: match.profile.markers,
          distance: match.distance,
          comparedMarkers: match.comparedMarkers,
          identicalMarkers: match.identicalMarkers,
          percentIdentical: match.percentIdentical
        }));

        const filters: Filters = {
          haplogroups: [filterHaplogroup],
          includeSubclades: true
        };

        const filtered = await processMatches(matchesForFilter, filters);
        
        // Конвертируем обратно в STRMatch
        const filteredSTRMatches = strMatches.filter(match =>
          filtered.some(f => f.id === match.profile.kitNumber) ||
          (!match.profile.haplogroup && showEmptyHaplogroups)
        );
        
        setHaplogroupFilteredMatches(filteredSTRMatches);
      } else {
        // Простая фильтрация без субкладов
        const filtered = strMatches.filter(match => {
          const haplogroup = match.profile?.haplogroup;
          if (!haplogroup) {
            return showEmptyHaplogroups;
          }
          return haplogroup === filterHaplogroup;
        });
        
        setHaplogroupFilteredMatches(filtered);
      }
    } catch (error) {
      console.error('❌ Ошибка фильтрации гаплогрупп:', error);
      setHaplogroupFilteredMatches(strMatches);
    } finally {
      setLoading(false);
    }
  }, [filterHaplogroup, includeSubclades, showEmptyHaplogroups, strMatches, setLoading]);

  // Сбрасываем фильтр
  const handleResetFilter = useCallback(() => {
    setFilterHaplogroup('');
    setIsFilterActive(false);
    setHaplogroupFilteredMatches(strMatches);
  }, [strMatches, setFilterHaplogroup, setIsFilterActive, setHaplogroupFilteredMatches]);

  // Определяем, какие матчи показывать
  const displayedMatches = isFilterActive ? haplogroupFilteredMatches : strMatches;

  // Обновляем отфильтрованные матчи при изменении основных матчей
  useEffect(() => {
    if (!isFilterActive) {
      setHaplogroupFilteredMatches(strMatches);
    }
  }, [strMatches, isFilterActive]);

  // 🔄 УПРОЩЕННАЯ функция для сохранения только отфильтрованных профилей
  const handleKeepFilteredOnly = useCallback(async () => {
    if (!displayedMatches?.length || !query) return;

    try {
      setLoading(true);
      // Получаем kit numbers отфильтрованных профилей
      const filteredKitNumbers = new Set(displayedMatches.map(match => match.profile.kitNumber));
      
      // Добавляем текущий query профиль в список сохраняемых
      if (query.kitNumber) {
        filteredKitNumbers.add(query.kitNumber);
      }
      
      // 🔄 Фильтруем базу данных только в памяти
      const filteredDatabase = database.filter(profile =>
        filteredKitNumbers.has(profile.kitNumber)
      );

      // Обновляем базу данных в памяти
      setDatabase(filteredDatabase);
      
      // Обновляем все наборы матчей
      setStrMatches(displayedMatches);
      setHaplogroupFilteredMatches(displayedMatches);
      
      // Сбрасываем фильтры после сохранения
      setFilterHaplogroup('');
      setIsFilterActive(false);
      
      console.log(`🔄 Оставлено ${filteredDatabase.length} отфильтрованных профилей`);
    } catch (error) {
      console.error('Error keeping filtered profiles:', error);
      setError('Failed to update database with filtered profiles');
    } finally {
      setLoading(false);
    }
  }, [displayedMatches, database, query, setLoading, setError, setDatabase, setStrMatches,
      setHaplogroupFilteredMatches, setFilterHaplogroup, setIsFilterActive]);

  // 🔄 УПРОЩЕННАЯ функция для удаления отфильтрованных профилей
  const handleRemoveFiltered = useCallback(async () => {
    if (!displayedMatches?.length) return;

    try {
      setLoading(true);
      // Получаем kit numbers отфильтрованных профилей
      const filteredKitNumbers = new Set(displayedMatches.map(match => match.profile.kitNumber));
      
      // 🔄 Фильтруем базу данных только в памяти, оставляя только НЕ отфильтрованные профили
      const remainingDatabase = database.filter(profile =>
        !filteredKitNumbers.has(profile.kitNumber)
      );

      // Обновляем базу данных в памяти
      setDatabase(remainingDatabase);
      
      // Обновляем все наборы матчей
      const remainingMatches = strMatches.filter(match =>
        !filteredKitNumbers.has(match.profile.kitNumber)
      );
      setStrMatches(remainingMatches);
      setHaplogroupFilteredMatches(remainingMatches);
      
      // Сбрасываем фильтры после удаления
      setFilterHaplogroup('');
      setIsFilterActive(false);
      
      console.log(`🔄 Удалено ${filteredKitNumbers.size} профилей, осталось ${remainingDatabase.length}`);
    } catch (error) {
      console.error('Error removing filtered profiles:', error);
      setError('Failed to remove filtered profiles from database');
    } finally {
      setLoading(false);
    }
  }, [displayedMatches, database, strMatches, setLoading, setError, setDatabase, setStrMatches,
      setHaplogroupFilteredMatches, setFilterHaplogroup, setIsFilterActive]);

  // Добавляем функцию для экспорта базы данных в CSV
  // 🔄 УПРОЩЕННАЯ функция экспорта
  const handleExportDatabase = useCallback(async () => {
    if (!totalProfiles) return;

    try {
      setLoading(true);
      
      // 🔄 УПРОЩЕНИЕ: экспортируем данные прямо из массива
      const exportData = database;

      // Создаем заголовок CSV
      const headers = ['kitNumber', 'name', 'country', 'haplogroup', ...markers];
      
      // Конвертируем данные в CSV формат
      const csvContent = [
        headers.join(','),
        ...exportData.map(profile => {
          const row = [
            profile.kitNumber,
            profile.name || '',
            profile.country || '',
            profile.haplogroup || '',
            ...markers.map(marker => profile.markers[marker] || '')
          ];
          // Экранируем значения, содержащие запятые или кавычки
          return row.map(value => {
            if (value.includes(',') || value.includes('"')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',');
        })
      ].join('\n');

      // Создаем Blob и ссылку для скачивания
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `str_database_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`✅ Экспортировано ${exportData.length} профилей`);
    } catch (error) {
      console.error('❌ Ошибка экспорта базы данных:', error);
      setError('Failed to export database');
    } finally {
      setLoading(false);
    }
  }, [database, totalProfiles, setLoading, setError]);

  return (
    <>
      <AppHeader />
      {error && (
        <div className="w-full max-w-[1600px] mx-auto px-4 py-2 mb-5">
          <div className="bg-red-100 border border-red-400 text-red-700 px-5 py-4 rounded-xl shadow-md">
            {error}
          </div>
        </div>
      )}
      
      <div className="w-full max-w-[1600px] mx-auto px-4">
        <div className="flex gap-8 mb-8">
          <div className="w-96 flex-shrink-0">
            <div className="space-y-6 sticky top-4">
              <Collapsible title={t('search.history')} defaultOpen={false}>
                <div className="space-y-2">
                  {searchHistory.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors shadow-sm hover:shadow-md border border-transparent hover:border-gray-200"
                      onClick={() => populateFromKitNumber(item.kitNumber)}
                    >
                      <div className="w-full">
                        <div className="font-medium text-primary">{item.kitNumber}</div>
                        <div className="text-sm text-gray-500 flex justify-between mt-1">
                          <span className="font-medium">{item.name || '-'}</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">{item.haplogroup || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {searchHistory.length === 0 && (
                    <div className="text-gray-500 text-sm p-2">
                      {t('search.noHistory')}
                    </div>
                  )}
                </div>
              </Collapsible>

              <AadnaKitList onKitNumberClick={populateFromKitNumber} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="space-y-4">
              <Collapsible title={t('database.sources')} defaultOpen={true}>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    {t('database.loadedProfiles')}: {totalProfiles}
                  </div>
                  <DataRepositories
                    onLoadData={async () => {}}
                    mergeDatabase={mergeDatabase}
                    setDatabase={setDatabase}
                  />
                </div>
              </Collapsible>
              
              <Collapsible title={t('database.manualInput')} defaultOpen={false}>
                <DatabaseInput
                  onDataLoaded={mergeDatabase}
                  onError={setError}
                  recordCount={totalProfiles}
                />
              </Collapsible>

              <Collapsible title={t('settings.title')} defaultOpen={true}>
                <div className="space-y-4">
                  <SearchSettings
                    kitNumber={kitNumber}
                    setKitNumber={setKitNumber}
                    maxDistance={maxDistance}
                    setMaxDistance={setMaxDistance}
                    maxMatches={maxMatches}
                    setMaxMatches={setMaxMatches}
                    markerCount={markerCount as MarkerCount}
                    setMarkerCount={setMarkerCount as (value: MarkerCount) => void}
                    markerSortOrder={markerSortOrder as 'default' | 'mutation_rate'}
                    setMarkerSortOrder={setMarkerSortOrder as (value: 'default' | 'mutation_rate') => void}
                    calculationMode={calculationMode}
                    setCalculationMode={setCalculationMode}
                    onPopulateMarkers={() => {
                      const selectedProfile = database.find(profile => profile.kitNumber === kitNumber);
                      if (selectedProfile) {
                        setQuery(selectedProfile);
                        markerOperations.populateMarkerInputs(selectedProfile);
                      }
                    }}
                    onReset={handleReset}
                    onSearch={handleSearch}
                    onClearDatabase={handleClearDatabase}
                    onExportDatabase={handleExportDatabase}
                    loading={loading}
                    disabled={!kitNumber || totalProfiles === 0}
                    databaseSize={totalProfiles}
                  />
                  <HaplogroupFilter
                    id="haplogroup-filter"
                    filterHaplogroup={filterHaplogroup}
                    setFilterHaplogroup={setFilterHaplogroup}
                    includeSubclades={includeSubclades}
                    setIncludeSubclades={setIncludeSubclades}
                    showEmptyHaplogroups={showEmptyHaplogroups}
                    setShowEmptyHaplogroups={setShowEmptyHaplogroups}
                    onApplyFilter={handleApplyFilter}
                    onResetFilter={handleResetFilter}
                    onKeepFilteredOnly={handleKeepFilteredOnly}
                    onRemoveFiltered={handleRemoveFiltered}
                  />
                </div>
              </Collapsible>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <Collapsible title={t('markers.title')} defaultOpen={false}>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[1600px]">
                <STRMarkerGrid
                  initialMarkers={query?.markers || {}}
                  onMarkerChange={handleMarkerChange}
                />
              </div>
            </div>
          </Collapsible>
        </div>

        {(displayedMatches?.length > 0) && (
          <div className="w-full">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('matches.found', { count: displayedMatches.length })}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <MatchesTable
                  matches={displayedMatches}
                  query={query}
                  onKitNumberClick={populateFromKitNumber}
                  onRemoveMatch={handleRemoveMatch}
                  onRemoveMarker={handleRemoveMarker}
                  sortOrder={markerSortOrder}
                  selectedMarkerCount={markerCount}
                  onFindMatches={handleSearch}
                  calculationMode={calculationMode}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default STRMatcher;