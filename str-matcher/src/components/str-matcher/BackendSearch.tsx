"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBackendAPI } from '@/hooks/useBackendAPI';
import type { STRMatch, STRProfile } from '@/utils/constants';
import { markerGroups } from '@/utils/constants';
import AdvancedMatchesTable from './AdvancedMatchesTable';
import STRMarkerGrid from './STRMarkerGrid';
import HaplogroupInfoPopup from './HaplogroupInfoPopup';
import ProfileEditModal from './ProfileEditModal';
import ImportProfilesModal from './ImportProfilesModal';
import { Checkbox } from '@/components/ui/checkbox';
import { processMatches } from '@/utils/calculations';
import type { Match, Filters } from '@/types';
import { useSelector, useDispatch } from 'react-redux';
import { importProfiles, clearImportedProfiles } from '@/store/importedProfilesSlice';
import type { RootState } from '@/store/store';
import { Upload, Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface BackendSearchProps {
  onMatchesFound?: (matches: STRMatch[]) => void;
}

const BackendSearch: React.FC<BackendSearchProps> = ({ onMatchesFound }) => {
  const { findMatches, getProfile, getDatabaseStats, loading, error } = useBackendAPI();
  const dispatch = useDispatch();
  const importedProfiles = useSelector((state: RootState) => state.importedProfiles.profiles);
  const importStats = useSelector((state: RootState) => state.importedProfiles.stats);
  const { t } = useTranslation();

  const [kitNumber, setKitNumber] = useState('');
  const [profile, setProfile] = useState<STRProfile | null>(null);
  const [matches, setMatches] = useState<STRMatch[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<STRMatch[]>([]);
  const [maxDistance, setMaxDistance] = useState(25);
  const [maxResults, setMaxResults] = useState(150);
  const [markerCount, setMarkerCount] = useState<12 | 25 | 37 | 67 | 111>(37);
  const [dbStats, setDbStats] = useState<any>(null);
  const [customMarkers, setCustomMarkers] = useState<Record<string, string>>({});
  const [searchMode, setSearchMode] = useState<'kit' | 'markers'>('kit');
  const [selectedHaplogroup, setSelectedHaplogroup] = useState('');
  const [includeSubclades, setIncludeSubclades] = useState(true);
  const [showEmptyHaplogroups, setShowEmptyHaplogroups] = useState(false);
  const [tempHaplogroupFilter, setTempHaplogroupFilter] = useState('');
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [selectedHaplogroupInfo, setSelectedHaplogroupInfo] = useState<string | null>(null);
  const [editingKitNumber, setEditingKitNumber] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Load database stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getDatabaseStats();
        setDbStats(stats?.statistics);
      } catch (error) {
        console.error('Failed to load database stats:', error);
      }
    };
    loadStats();
  }, [getDatabaseStats]);

  // Handle import of profiles
  const handleImport = useCallback((profiles: STRProfile[], stats: any) => {
    // Calculate actual stats
    const existingKitNumbers = new Set(
      matches.map(m => m.profile.kitNumber)
    );

    const newProfiles = profiles.filter(p => !existingKitNumbers.has(p.kitNumber));
    const overriddenProfiles = profiles.filter(p => existingKitNumbers.has(p.kitNumber));

    const updatedStats = {
      totalImported: profiles.length,
      newProfiles: newProfiles.length,
      overriddenProfiles: overriddenProfiles.length,
      skippedProfiles: 0,
    };

    dispatch(importProfiles({ profiles, stats: updatedStats }));

    // Show success message
    alert(
      `Импорт завершен:\n` +
      `• Всего импортировано: ${updatedStats.totalImported}\n` +
      `• Новых профилей: ${updatedStats.newProfiles}\n` +
      `• Переопределено: ${updatedStats.overriddenProfiles}`
    );
  }, [matches, dispatch]);

  // Merge imported profiles with search results
  // Imported profiles take priority over database profiles
  const mergeProfiles = useCallback((dbMatches: STRMatch[], queryProfile: STRProfile | null): STRMatch[] => {
    if (importedProfiles.length === 0) {
      return dbMatches;
    }

    // Create a map of imported profiles by kit number
    const importedMap = new Map(
      importedProfiles.map(p => [p.kitNumber, p])
    );

    // Override database profiles with imported ones
    const merged = dbMatches.map(match => {
      const imported = importedMap.get(match.profile.kitNumber);
      if (imported) {
        // Profile exists in imports - use imported version
        return {
          ...match,
          profile: imported,
        };
      }
      return match;
    });

    // Add new imported profiles that don't exist in database results
    const existingKitNumbers = new Set(dbMatches.map(m => m.profile.kitNumber));
    const newImportedProfiles = importedProfiles.filter(
      p => !existingKitNumbers.has(p.kitNumber)
    );

    // Create STRMatch objects for new imported profiles
    // Note: We need to calculate distance if there's a query profile
    if (queryProfile && newImportedProfiles.length > 0) {
      const newMatches: STRMatch[] = newImportedProfiles.map(imported => {
        // Simple distance calculation
        const commonMarkers = Object.keys(queryProfile.markers).filter(
          marker => imported.markers[marker]
        );
        const distance = commonMarkers.reduce((acc, marker) => {
          return acc + (queryProfile.markers[marker] !== imported.markers[marker] ? 1 : 0);
        }, 0);

        return {
          profile: imported,
          distance,
          comparedMarkers: commonMarkers.length,
          identicalMarkers: commonMarkers.length - distance,
          percentIdentical: ((commonMarkers.length - distance) / commonMarkers.length) * 100,
          hasAllRequiredMarkers: true,
        };
      });

      merged.push(...newMatches);
    }

    // Sort by distance
    return merged.sort((a, b) => a.distance - b.distance);
  }, [importedProfiles]);

  const handleSearchByKit = useCallback(async () => {
    if (!kitNumber.trim()) {
      return;
    }

    try {
      // First check if profile exists in imported profiles
      let foundProfile = importedProfiles.find(p => p.kitNumber === kitNumber.trim());

      // If not found in imports, get from database
      if (!foundProfile) {
        foundProfile = await getProfile(kitNumber.trim());
        if (!foundProfile) {
          alert(`Profile with kit number ${kitNumber} not found`);
          return;
        }
      }

      // Filter markers based on selected panel
      const panelMarkers = markerGroups[markerCount as keyof typeof markerGroups] || [];
      const panelMarkerSet = new Set(panelMarkers);
      const filteredMarkers = Object.fromEntries(
        Object.entries(foundProfile.markers).filter(([marker]) =>
          panelMarkerSet.has(marker as any)
        )
      );

      // Set profile with filtered markers only
      setProfile({
        ...foundProfile,
        markers: filteredMarkers
      });
      setCustomMarkers(filteredMarkers);

      // Then search for matches using only the panel's markers
      // Note: We pass haplogroupFilter to backend, but also do FTDNA filtering on frontend
      const searchMatches = await findMatches({
        markers: filteredMarkers,
        maxDistance,
        limit: maxResults,
        markerCount,
        haplogroupFilter: undefined, // Let FTDNA tree handle filtering
      });

      // Filter out the query profile itself from results
      const cleanedMatches = searchMatches.filter(match =>
        match.profile?.kitNumber !== foundProfile.kitNumber
      );

      // Merge with imported profiles
      const mergedMatches = mergeProfiles(cleanedMatches, foundProfile);

      setMatches(mergedMatches);
      setFilteredMatches(mergedMatches);
      onMatchesFound?.(mergedMatches);

    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [kitNumber, maxDistance, maxResults, markerCount, selectedHaplogroup, getProfile, findMatches, onMatchesFound, mergeProfiles, importedProfiles]);

  const handleSearchByMarkers = useCallback(async () => {
    const markersToSearch = Object.fromEntries(
      Object.entries(customMarkers).filter(([_, value]) => value.trim() !== '')
    );

    if (Object.keys(markersToSearch).length === 0) {
      alert('Please enter at least one marker value');
      return;
    }

    try {
      // Filter markers based on selected panel
      const panelMarkers = markerGroups[markerCount as keyof typeof markerGroups] || [];
      const panelMarkerSet = new Set(panelMarkers);
      const filteredMarkers = Object.fromEntries(
        Object.entries(markersToSearch).filter(([marker]) =>
          panelMarkerSet.has(marker as any)
        )
      );

      // Create a temporary profile BEFORE searching (needed for mergeProfiles)
      const tempProfile: STRProfile = {
        kitNumber: 'Custom Search',
        name: 'Custom Marker Search',
        country: '',
        haplogroup: '',
        markers: filteredMarkers,
      };
      setProfile(tempProfile);

      const searchMatches = await findMatches({
        markers: filteredMarkers,
        maxDistance,
        limit: maxResults,
        markerCount,
        haplogroupFilter: undefined, // Let FTDNA tree handle filtering
      });

      // Merge with imported profiles (pass tempProfile explicitly)
      const mergedMatches = mergeProfiles(searchMatches, tempProfile);

      setMatches(mergedMatches);
      setFilteredMatches(mergedMatches);
      onMatchesFound?.(mergedMatches);

      // Update profile display (already set above)
      setProfile({
        kitNumber: 'Custom Search',
        name: 'Custom Marker Search',
        country: '',
        haplogroup: '',
        markers: filteredMarkers,
      });

    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [customMarkers, maxDistance, maxResults, markerCount, selectedHaplogroup, findMatches, onMatchesFound, mergeProfiles]);

  const handleMarkerChange = useCallback((marker: string, value: string) => {
    setCustomMarkers(prev => ({
      ...prev,
      [marker]: value
    }));
  }, []);

  const handleKitNumberClick = useCallback(async (clickedKitNumber: string) => {
    // Устанавливаем новый kit number и запускаем поиск
    setKitNumber(clickedKitNumber);

    try {
      // First check if profile exists in imported profiles
      let foundProfile = importedProfiles.find(p => p.kitNumber === clickedKitNumber);

      // If not found in imports, get from database
      if (!foundProfile) {
        foundProfile = await getProfile(clickedKitNumber);
        if (!foundProfile) {
          alert(`Profile with kit number ${clickedKitNumber} not found`);
          return;
        }
      }

      setProfile(foundProfile);
      setCustomMarkers(foundProfile.markers);

      // Ищем совпадения для нового профиля
      const searchMatches = await findMatches({
        markers: foundProfile.markers,
        maxDistance,
        limit: maxResults,
        markerCount,
        haplogroupFilter: undefined, // Let FTDNA tree handle filtering
      });

      // Фильтруем сам профиль из результатов
      const cleanedMatches = searchMatches.filter(match =>
        match.profile?.kitNumber !== foundProfile.kitNumber
      );

      // Merge with imported profiles
      const mergedMatches = mergeProfiles(cleanedMatches, foundProfile);

      setMatches(mergedMatches);
      setFilteredMatches(mergedMatches);
      onMatchesFound?.(mergedMatches);

    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [maxDistance, maxResults, markerCount, selectedHaplogroup, getProfile, findMatches, onMatchesFound, mergeProfiles, importedProfiles]);

  const handleRemoveMarker = useCallback(async (markerToRemove: string) => {
    if (!profile) return;

    // Удаляем маркер из customMarkers и profile
    const updatedMarkers = { ...customMarkers };
    delete updatedMarkers[markerToRemove];
    setCustomMarkers(updatedMarkers);

    // Обновляем profile
    const updatedProfile = {
      ...profile,
      markers: updatedMarkers
    };
    setProfile(updatedProfile);

    // Перезапускаем поиск с обновлённым набором маркеров
    try {
      const searchMatches = await findMatches({
        markers: updatedMarkers,
        maxDistance,
        limit: maxResults,
        markerCount,
        haplogroupFilter: undefined, // Let FTDNA tree handle filtering
      });

      const cleanedMatches = searchMatches.filter(match =>
        match.profile?.kitNumber !== updatedProfile.kitNumber
      );

      // Merge with imported profiles
      const mergedMatches = mergeProfiles(cleanedMatches, updatedProfile);

      setMatches(mergedMatches);
      setFilteredMatches(mergedMatches);
      onMatchesFound?.(mergedMatches);

    } catch (error) {
      console.error('Search after marker removal failed:', error);
    }
  }, [profile, customMarkers, maxDistance, maxResults, markerCount, selectedHaplogroup, findMatches, onMatchesFound, mergeProfiles]);

  // Apply haplogroup filter
  const handleApplyFilter = useCallback(async (haplogroupToFilter?: string) => {
    const haplogroup = haplogroupToFilter || selectedHaplogroup;

    if (!haplogroup || matches.length === 0) {
      setFilteredMatches(matches);
      setIsFilterActive(false);
      return;
    }

    try {
      setFiltering(true);
      setIsFilterActive(true);

      if (includeSubclades) {
        // Convert STRMatch[] to Match[] for processMatches
        const matchesForFilter: Match[] = matches.map(match => ({
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
          showEmptyHaplogroups,
          haplogroups: [haplogroup],
          includeSubclades: true
        };

        const filtered = await processMatches(matchesForFilter, filters);

        // Convert back to STRMatch[]
        const filteredSTRMatches = matches.filter(match =>
          filtered.some(f => f.id === match.profile.kitNumber) ||
          (!match.profile.haplogroup && showEmptyHaplogroups)
        );

        setFilteredMatches(filteredSTRMatches);
      } else {
        // Simple filtering without subclades
        const filtered = matches.filter(match => {
          const matchHaplogroup = match.profile?.haplogroup;
          if (!matchHaplogroup) {
            return showEmptyHaplogroups;
          }
          return matchHaplogroup === haplogroup;
        });

        setFilteredMatches(filtered);
      }
    } catch (error) {
      console.error('❌ Filter error:', error);
      setFilteredMatches(matches);
    } finally {
      setFiltering(false);
    }
  }, [selectedHaplogroup, includeSubclades, showEmptyHaplogroups, matches]);

  // Reset filter
  const handleResetFilter = useCallback(() => {
    setSelectedHaplogroup('');
    setTempHaplogroupFilter('');
    setIsFilterActive(false);
    setFilteredMatches(matches);
  }, [matches]);

  // Handle haplogroup click for quick filtering
  const handleHaplogroupClick = useCallback((haplogroup: string) => {
    // Set the selected haplogroup and temp filter
    setSelectedHaplogroup(haplogroup);
    setTempHaplogroupFilter(haplogroup);

    // Apply filter immediately with the clicked haplogroup
    handleApplyFilter(haplogroup);
  }, [handleApplyFilter]);

  // Determine which matches to display
  const displayedMatches = isFilterActive ? filteredMatches : matches;

  // Update filtered matches when main matches change
  useEffect(() => {
    if (!isFilterActive) {
      setFilteredMatches(matches);
    }
  }, [matches, isFilterActive]);

  return (<>
    <div className="pb-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-2 space-y-2">
        {/* Very Compact Header */}
        <div className="text-center mb-2">
          <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
            🧬 YSTR Genetic Matcher
          </h1>
          <p className="text-xs text-gray-600">
            Search through {dbStats ? parseInt(dbStats.totalProfiles).toLocaleString() : 'Loading...'} YSTR profiles
          </p>
        </div>

        {/* Inline Statistics */}
        {dbStats && (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md border border-white/20 p-2 mb-2">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-sm font-bold text-blue-600">{parseInt(dbStats.totalProfiles).toLocaleString()}</div>
                <div className="text-xs text-gray-600">Profiles</div>
              </div>
              <div>
                <div className="text-sm font-bold text-green-600">{parseInt(dbStats.uniqueHaplogroups).toLocaleString()}</div>
                <div className="text-xs text-gray-600">Haplogroups</div>
              </div>
              <div>
                <div className="text-sm font-bold text-purple-600">{parseFloat(dbStats.avgMarkersPerProfile).toFixed(1)}</div>
                <div className="text-xs text-gray-600">Avg Markers</div>
              </div>
              <div>
                <div className="text-sm font-bold text-orange-600">{dbStats.topHaplogroups?.[0]?.haplogroup || 'N/A'}</div>
                <div className="text-xs text-gray-600">Top Haplo</div>
              </div>
            </div>
          </div>
        )}

        {/* Compact Search Interface */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Search Configuration</h2>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 ${searchMode === 'kit'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
                  }`}
                onClick={() => setSearchMode('kit')}
              >
                🎯 Search by Kit Number
              </button>
              <button
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 ${searchMode === 'markers'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
                  }`}
                onClick={() => setSearchMode('markers')}
              >
                🧬 Search by Markers
              </button>

              {/* Import Button */}
              <button
                className="px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg flex items-center gap-2"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="h-4 w-4" />
                Import Profiles
              </button>

              {/* Clear Import Button (shown when profiles are imported) */}
              {importedProfiles.length > 0 && (
                <button
                  className="px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md hover:shadow-lg flex items-center gap-2"
                  onClick={() => {
                    if (confirm(`Delete ${importedProfiles.length} imported profiles?`)) {
                      dispatch(clearImportedProfiles());
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Очистить импорт ({importedProfiles.length})
                </button>
              )}
            </div>

            {/* Import Stats Banner */}
            {importStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 text-white rounded-full p-2">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-green-900">Импортировано профилей</div>
                    <div className="text-sm text-green-700">
                      Всего: {importStats.totalImported} • Новых: {importStats.newProfiles} • Переопределено: {importStats.overriddenProfiles}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(clearImportedProfiles())}
                  className="text-green-700 hover:text-green-900 text-sm underline"
                >
                  Очистить
                </button>
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Compact Search Settings */}
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1" style={{ width: '200px' }}>
                <label className="block text-xs font-semibold text-gray-700">Панель маркеров</label>
                <select
                  value={markerCount}
                  onChange={(e) => setMarkerCount(parseInt(e.target.value) as 12 | 25 | 37 | 67 | 111)}
                  className="w-full px-3 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-sm font-semibold"
                >
                  <option value="12">Y-STR12</option>
                  <option value="25">Y-STR25</option>
                  <option value="37">Y-STR37</option>
                  <option value="67">Y-STR67</option>
                  <option value="111">Y-STR111</option>
                </select>
              </div>
              <div className="space-y-1" style={{ width: '200px' }}>
                <label className="block text-xs font-semibold text-gray-700">Max Genetic Distance</label>
                <div className="relative">
                  <input
                    type="number"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(parseInt(e.target.value) || 5)}
                    min="0"
                    max="50"
                    className="w-full px-3 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 text-sm"
                    placeholder="5"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-400 text-xs font-semibold">GD</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1" style={{ width: '200px' }}>
                <label className="block text-xs font-semibold text-gray-700">Max Results</label>
                <div className="relative">
                  <input
                    type="number"
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value) || 150)}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 text-sm"
                    placeholder="150"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-400 text-xs font-semibold">MAX</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Haplogroup Filter */}
            <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
              <label className="block text-xs font-semibold text-gray-700">Haplogroup Filter</label>
              <div className="flex items-center gap-2">
                <div className="flex-grow relative">
                  {tempHaplogroupFilter && (
                    <button
                      onClick={() => {
                        setTempHaplogroupFilter('');
                        setSelectedHaplogroup('');
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 z-10"
                      title="Reset filter"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                  <input
                    type="text"
                    value={tempHaplogroupFilter}
                    onChange={(e) => setTempHaplogroupFilter(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedHaplogroup(tempHaplogroupFilter);
                        handleApplyFilter(tempHaplogroupFilter);
                      }
                    }}
                    placeholder="Enter haplogroup (e.g., R-M269, J-M172)"
                    className={`w-full px-3 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-sm ${tempHaplogroupFilter ? 'pl-8' : ''}`}
                  />
                </div>
                <button
                  onClick={() => {
                    setSelectedHaplogroup(tempHaplogroupFilter);
                    handleApplyFilter(tempHaplogroupFilter);
                  }}
                  disabled={filtering}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300 text-sm disabled:opacity-50"
                >
                  {filtering ? 'Filtering...' : 'Apply Filter'}
                </button>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-subclades"
                    checked={includeSubclades}
                    onCheckedChange={(checked) => {
                      if (typeof checked === 'boolean') {
                        setIncludeSubclades(checked);
                      }
                    }}
                  />
                  <label htmlFor="include-subclades" className="text-sm text-gray-700">
                    Include subclades
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-empty-haplogroups"
                    checked={showEmptyHaplogroups}
                    onCheckedChange={(checked) => {
                      if (typeof checked === 'boolean') {
                        setShowEmptyHaplogroups(checked);
                      }
                    }}
                  />
                  <label htmlFor="show-empty-haplogroups" className="text-sm text-gray-700">
                    Show empty haplogroups
                  </label>
                </div>
              </div>

              {selectedHaplogroup && isFilterActive && (
                <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  🎯 Active filter: <strong>{selectedHaplogroup}</strong> {includeSubclades && '(with subclades)'}
                  <span className="ml-2 text-gray-600">({displayedMatches.length} of {matches.length} matches)</span>
                </div>
              )}
            </div>

            {searchMode === 'kit' ? (
              <div className="space-y-3">
                <div className="space-y-1" style={{ maxWidth: '400px' }}>
                  <label className="block text-xs font-semibold text-gray-700">Kit Number</label>
                  <input
                    type="text"
                    value={kitNumber}
                    onChange={(e) => setKitNumber(e.target.value)}
                    placeholder="Enter kit number (e.g., 100055)"
                    className="w-full px-3 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 text-sm"
                  />
                </div>
                <button
                  onClick={handleSearchByKit}
                  disabled={loading || filtering || !kitNumber.trim()}
                  style={{ maxWidth: '400px' }}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-md"
                >
                  {loading || filtering ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">{filtering ? 'Filtering by haplogroup...' : 'Searching...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>🔍</span>
                      <span className="text-sm">Search for Matches</span>
                    </div>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Enter STR Markers</label>
                  <p className="text-xs text-gray-600 mb-2">
                    Enter values for the markers you want to search with:
                  </p>
                  <STRMarkerGrid
                    initialMarkers={customMarkers}
                    onMarkerChange={handleMarkerChange}
                  />
                </div>
                <button
                  onClick={handleSearchByMarkers}
                  disabled={loading || filtering}
                  style={{ maxWidth: '400px' }}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-md"
                >
                  {loading || filtering ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">{filtering ? 'Filtering by haplogroup...' : 'Searching...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>🧬</span>
                      <span className="text-sm">Search by Markers</span>
                    </div>
                  )}
                </button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Compact Current Profile */}
        {profile && (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-md border border-white/20 p-2">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div><span className="font-semibold text-gray-700">Query:</span> <span className="font-mono text-blue-600">{profile.kitNumber}</span></div>
              <div><span className="font-semibold text-gray-700">Name:</span> {profile.name || 'Unknown'}</div>
              <div><span className="font-semibold text-gray-700">Country:</span> {profile.country || 'Unknown'}</div>
              <div><span className="font-semibold text-gray-700">Haplogroup:</span> <span className="font-mono text-purple-600">{profile.haplogroup || 'Unknown'}</span></div>
              <div><span className="font-semibold text-gray-700">Markers:</span> {Object.keys(profile.markers).length}</div>
            </div>
          </div>
        )}

      </div>
    </div>

    {/* Matches Results - Full Width */}
    {matches.length > 0 && (
      <div className="w-full bg-white shadow-lg mt-4 overflow-x-auto py-4">
        <AdvancedMatchesTable
          matches={displayedMatches}
          query={profile}
          showOnlyDifferences={true}
          onKitNumberClick={handleKitNumberClick}
          onRemoveMarker={handleRemoveMarker}
          onHaplogroupClick={handleHaplogroupClick}
          onHaplogroupInfo={setSelectedHaplogroupInfo}
          onEditProfile={setEditingKitNumber}
        />
      </div>
    )}

    {/* Haplogroup Info Popup */}
    {selectedHaplogroupInfo && (
      <HaplogroupInfoPopup
        haplogroup={selectedHaplogroupInfo}
        onClose={() => setSelectedHaplogroupInfo(null)}
      />
    )}

    {/* Profile Edit Modal */}
    {editingKitNumber && (
      <ProfileEditModal
        kitNumber={editingKitNumber}
        onClose={() => setEditingKitNumber(null)}
      />
    )}

    {/* Import Profiles Modal */}
    <ImportProfilesModal
      isOpen={showImportModal}
      onClose={() => setShowImportModal(false)}
      onImport={handleImport}
    />
  </>);
};

export default BackendSearch;
