"use client";

import React, { useState, useMemo, useCallback } from 'react';
import type { STRMatch, STRProfile } from '@/utils/constants';
import { calculateMarkerDifference } from '@/utils/calculations';
import { palindromes } from '@/utils/constants';
import { getMarkersSortedByMutationRate } from '@/utils/mutation-rates';
import { Download, Copy, Check } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface AdvancedMatchesTableProps {
  matches: STRMatch[];
  query: STRProfile | null;
  showOnlyDifferences?: boolean;
  onKitNumberClick?: (kitNumber: string) => void;
  onRemoveMarker?: (marker: string) => void;
  onHaplogroupClick?: (haplogroup: string) => void;
  onHaplogroupInfo?: (haplogroup: string) => void;
  onEditProfile?: (kitNumber: string) => void;
}

// FTDNA marker order (111 markers)
const FTDNA_MARKER_ORDER = [
  // Panel 1 (1-12)
  'DYS393', 'DYS390', 'DYS19', 'DYS391', 'DYS385', 'DYS426', 'DYS388', 'DYS439', 'DYS389i', 'DYS392', 'DYS389ii',
  // Panel 2 (13-25)
  'DYS458', 'DYS459', 'DYS455', 'DYS454', 'DYS447', 'DYS437', 'DYS448', 'DYS449', 'DYS464',
  // Panel 3 (26-37)
  'DYS460', 'Y-GATA-H4', 'YCAII', 'DYS456', 'DYS607', 'DYS576', 'DYS570', 'CDY', 'DYS442', 'DYS438',
  // Panel 4 (38-67)
  'DYS531', 'DYS578', 'DYF395S1', 'DYS590', 'DYS537', 'DYS641', 'DYS472', 'DYF406S1', 'DYS511',
  'DYS425', 'DYS413', 'DYS557', 'DYS594', 'DYS436', 'DYS490', 'DYS534', 'DYS450', 'DYS444', 'DYS481', 'DYS520', 'DYS446',
  'DYS617', 'DYS568', 'DYS487', 'DYS572', 'DYS640', 'DYS492', 'DYS565',
  // Panel 5 (68-111)
  'DYS710', 'DYS485', 'DYS632', 'DYS495', 'DYS540', 'DYS714', 'DYS716', 'DYS717',
  'DYS505', 'DYS556', 'DYS549', 'DYS589', 'DYS522', 'DYS494', 'DYS533', 'DYS636', 'DYS575', 'DYS638',
  'DYS462', 'DYS452', 'DYS445', 'Y-GATA-A10', 'DYS463', 'DYS441', 'Y-GGAAT-1B07', 'DYS525',
  'DYS712', 'DYS593', 'DYS650', 'DYS532', 'DYS715', 'DYS504', 'DYS513', 'DYS561', 'DYS552',
  'DYS726', 'DYS635', 'DYS587', 'DYS643', 'DYS497', 'DYS510', 'DYS434', 'DYS461', 'DYS435'
];

interface MarkerRarity {
  frequency: number;
  level: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'extremely-rare';
}

const AdvancedMatchesTable: React.FC<AdvancedMatchesTableProps> = ({ matches, query, showOnlyDifferences = false, onKitNumberClick, onRemoveMarker, onHaplogroupClick, onHaplogroupInfo, onEditProfile }) => {
  const [showAllMarkers, setShowAllMarkers] = useState(false);
  const [markerFilters, setMarkerFilters] = useState<Record<string, boolean>>({});
  const [copiedKitNumber, setCopiedKitNumber] = useState<string | null>(null);
  const { t } = useTranslation();
  const [hiddenKitNumbers, setHiddenKitNumbers] = useState<Set<string>>(() => {
    // Load hidden kit numbers from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hiddenKitNumbers');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Hide/unhide kit number
  const toggleHideKitNumber = useCallback((kitNumber: string) => {
    setHiddenKitNumbers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kitNumber)) {
        newSet.delete(kitNumber);
      } else {
        newSet.add(kitNumber);
      }
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('hiddenKitNumbers', JSON.stringify(Array.from(newSet)));
      }
      return newSet;
    });
  }, []);

  // Clear all hidden kit numbers
  const clearHiddenKitNumbers = useCallback(() => {
    setHiddenKitNumbers(new Set());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hiddenKitNumbers');
    }
  }, []);

  // Filter out hidden matches
  const visibleMatches = useMemo(() => {
    return matches.filter(match => !hiddenKitNumbers.has(match.profile.kitNumber));
  }, [matches, hiddenKitNumbers]);

  // Calculate marker rarity based on frequency in visible matches
  const markerRarities = useMemo(() => {
    if (!query || visibleMatches.length === 0) return {};

    const rarities: Record<string, Record<string, MarkerRarity>> = {};

    // For each marker in the query
    Object.keys(query.markers).forEach(marker => {
      rarities[marker] = {};
      const queryValue = query.markers[marker];

      // Count how many matches have the same value for this marker
      const matchingCount = visibleMatches.filter(match =>
        match.profile?.markers[marker] === queryValue
      ).length;

      const frequency = matchingCount / visibleMatches.length;

      let level: MarkerRarity['level'] = 'common';
      if (frequency <= 0.04) level = 'extremely-rare';
      else if (frequency <= 0.08) level = 'very-rare';
      else if (frequency <= 0.15) level = 'rare';
      else if (frequency <= 0.25) level = 'uncommon';

      rarities[marker][queryValue] = { frequency, level };
    });

    return rarities;
  }, [query, matches]);

  // Get visible markers - ONLY show markers that differ in at least one match
  const visibleMarkers = useMemo(() => {
    if (!query) return [];

    const queryMarkers = Object.keys(query.markers);

    // ВСЕГДА показываем только маркеры с различиями
    const relevantMarkers = queryMarkers.filter(marker => {
      const queryValue = query.markers[marker];
      const hasQueryValue = queryValue && queryValue.trim() !== '';

      // Показываем маркер если он отличается хотя бы у одного профиля
      return matches.some(match => {
        const matchValue = match.profile?.markers[marker];
        const hasMatchValue = matchValue && matchValue.trim() !== '';

        // Различие если:
        // 1. Оба значения есть, но они разные
        // 2. У query есть значение, а у match нет
        // 3. У query нет значения, а у match есть
        if (hasQueryValue && hasMatchValue) {
          return matchValue !== queryValue;
        } else if (hasQueryValue && !hasMatchValue) {
          return true; // Query имеет значение, match не имеет - это различие
        } else if (!hasQueryValue && hasMatchValue) {
          return true; // Match имеет значение, query не имеет - это различие
        }
        return false; // Оба пустые - не различие
      });
    });

    // Sort by mutation rate: slow (stable, ancestral) → fast (recent divergence)
    return getMarkersSortedByMutationRate(relevantMarkers);
  }, [query, matches]);

  // Показываем ВСЕ различающиеся маркеры (без ограничений)
  const displayedMarkers = visibleMarkers;

  const getRarityClass = useCallback((marker: string, value: string) => {
    const rarity = markerRarities[marker]?.[value];
    if (!rarity) return 'bg-gray-100';

    switch (rarity.level) {
      case 'extremely-rare': return 'bg-red-500 text-white';
      case 'very-rare': return 'bg-orange-400 text-white';
      case 'rare': return 'bg-orange-200 text-gray-900';
      case 'uncommon': return 'bg-yellow-100 text-gray-900';
      case 'common': return 'bg-white';
      default: return 'bg-gray-100';
    }
  }, [markerRarities]);

  const toggleMarkerFilter = useCallback((marker: string) => {
    setMarkerFilters(prev => ({
      ...prev,
      [marker]: !prev[marker]
    }));
  }, []);

  // Фильтруем matches по выбранным маркерам
  const filteredMatches = useMemo(() => {
    const activeFilters = Object.entries(markerFilters).filter(([_, active]) => active);

    if (activeFilters.length === 0) {
      return visibleMatches;
    }

    return visibleMatches.filter(match => {
      return activeFilters.every(([marker, _]) => {
        const queryValue = query?.markers[marker];
        const matchValue = match.profile?.markers[marker];
        return queryValue && matchValue && queryValue === matchValue;
      });
    });
  }, [visibleMatches, markerFilters, query]);

  // Export matches to CSV
  const exportToCSV = useCallback(() => {
    if (!query) return;

    // Prepare CSV headers - use FTDNA order
    const headers = ['Kit Number', 'Name', 'Country', 'Haplogroup', 'GD', 'STR Count', '% Match'];
    const allMarkers = FTDNA_MARKER_ORDER.filter(marker => query.markers[marker]);
    headers.push(...allMarkers);

    // Prepare CSV rows
    const rows = filteredMatches.map(match => {
      const row = [
        match.profile?.kitNumber || '',
        match.profile?.name || '',
        match.profile?.country || '',
        match.profile?.haplogroup || '',
        match.distance.toString(),
        match.comparedMarkers.toString(),
        typeof match.percentIdentical === 'number' ? match.percentIdentical.toFixed(1) : match.percentIdentical
      ];

      // Add marker values in FTDNA order
      allMarkers.forEach(marker => {
        row.push(match.profile?.markers[marker] || '');
      });

      return row;
    });

    // Add query row at the top
    const queryRow = [
      query.kitNumber || 'Query',
      query.name || 'Query Profile',
      query.country || '',
      query.haplogroup || '',
      '0',
      Object.keys(query.markers).length.toString(),
      '100.0'
    ];
    allMarkers.forEach(marker => {
      queryRow.push(query.markers[marker] || '');
    });
    rows.unshift(queryRow);

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `matches_${query.kitNumber || 'query'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [query, filteredMatches]);

  // Copy haplotype to clipboard (for Nevgen calculator)
  const copyHaplotype = useCallback((profile: STRProfile) => {
    // Sort markers in FTDNA order
    const markerValues = FTDNA_MARKER_ORDER
      .filter(marker => profile.markers[marker]) // Only include markers that have values
      .map(marker => profile.markers[marker])
      .join('\t');

    navigator.clipboard.writeText(markerValues).then(() => {
      setCopiedKitNumber(profile.kitNumber);
      setTimeout(() => setCopiedKitNumber(null), 2000);
    });
  }, []);

  // Determine FTDNA Panel (Y37, Y67, Y111) based on marker count
  const getPanelBadge = useCallback((markers: Record<string, string>) => {
    if (!markers) return null;

    let count = 0;
    FTDNA_MARKER_ORDER.forEach(marker => {
      if (markers[marker] && markers[marker].trim() !== '') {
        count++;
        // Add extra count for palindromes
        if (marker in palindromes) {
          // @ts-ignore
          const extra = palindromes[marker] - 1;
          count += extra;
        }
      }
    });

    // Compact Badge Styles (Left of ID)
    const baseStyle = "ml-0.5 mr-1 px-1 py-px text-[9px] leading-none font-bold text-white rounded shadow-sm opacity-90";

    if (count >= 100) return <span className={`${baseStyle} bg-purple-600`} title="Y111 Panel">Y111</span>;
    if (count >= 60) return <span className={`${baseStyle} bg-indigo-500`} title="Y67 Panel">Y67</span>;
    if (count >= 30) return <span className={`${baseStyle} bg-blue-500`} title="Y37 Panel">Y37</span>;
    if (count >= 10) return <span className={`${baseStyle} bg-gray-400`} title="Y12 Panel">Y12</span>;

    return null;
  }, []);

  if (!matches || matches.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-6xl text-gray-300 mb-4">🧬</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Matches Found</h3>
          <p className="text-gray-500">Try adjusting your search parameters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simple Header like in original */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">
            {t("geneticMatches.title", { count: filteredMatches.length, outOf: filteredMatches.length !== visibleMatches.length ? `of ${visibleMatches.length} ` : "" })}
          </h2>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            title="Export matches to CSV"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm font-medium">Export CSV</span>
          </button>
        </div>
        <p className="text-sm text-gray-600">
          {filteredMatches.length !== visibleMatches.length ? (
            <>{t("geneticMatches.filtered", { count: filteredMatches.length, total: visibleMatches.length })}</>
          ) : (
            <>{t("geneticMatches.found", { count: visibleMatches.length })}</>
          )}
          {hiddenKitNumbers.size > 0 && (
            <span className="ml-2 text-orange-600">
              (скрыто: {hiddenKitNumbers.size})
            </span>
          )}
        </p>
        {hiddenKitNumbers.size > 0 && (
          <button
            onClick={clearHiddenKitNumbers}
            className="mt-2 px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Show all hidden ({hiddenKitNumbers.size})
          </button>
        )}
      </div>

      {/* Matches Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ tableLayout: 'fixed', width: 'auto' }}>
            {/* Beautiful Header */}
            <thead>
              {/* Main header row */}
              <tr className="bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 text-white">
                <th className="sticky left-0 bg-gradient-to-r from-slate-800 to-blue-900 border-r border-blue-700 px-2 py-1.5 text-center z-10 w-[100px] max-w-[100px] font-bold text-sm">
                  Kit
                </th>
                <th className="border-r border-blue-700 px-2 py-1.5 text-center w-[50px] max-w-[50px] font-bold text-sm">

                </th>
                <th className="border-r border-blue-700 px-2 py-1.5 text-center w-[150px] max-w-[150px] font-bold text-sm">
                  Name
                </th>
                <th className="border-r border-blue-700 px-2 py-1.5 text-center w-[120px] max-w-[120px] font-bold text-sm">
                  Country
                </th>
                <th className="border-r border-blue-700 px-2 py-1.5 text-center w-[180px] max-w-[180px] font-bold text-sm">
                  Haplogroup
                </th>
                <th className="border-r border-blue-700 px-2 py-2 text-center w-[60px] max-w-[60px] font-bold text-sm">
                  GD
                </th>
                <th className="border-r border-blue-700 px-2 py-2 text-center w-[60px] max-w-[60px] font-bold text-sm">
                  STRs
                </th>
                <th className="border-r border-blue-700 px-2 py-2 text-center w-[60px] max-w-[60px] font-bold text-sm">
                  %
                </th>
                {displayedMarkers.map((marker) => (
                  <th key={marker} className="border-r border-blue-700 px-1 pb-2 text-center w-[35px] max-w-[35px] min-w-[35px] font-bold text-xs relative h-[120px]">
                    {/* Кнопка удаления маркера - САМЫЙ ВЕРХ */}
                    {onRemoveMarker && (
                      <button
                        onClick={() => onRemoveMarker(marker)}
                        className="absolute left-1/2 -translate-x-1/2 text-red-600 hover:text-red-800 cursor-pointer font-bold leading-none text-lg"
                        style={{ top: 0, zIndex: 30 }}
                        title={`Удалить маркер ${marker}`}
                      >
                        ×
                      </button>
                    )}
                    {/* Чекбокс для фильтрации - ПОД КРЕСТИКОМ */}
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '24px', zIndex: 10 }}>
                      <input
                        type="checkbox"
                        checked={markerFilters[marker] || false}
                        onChange={() => toggleMarkerFilter(marker)}
                        className="cursor-pointer w-3 h-3"
                        title={`Фильтровать: показать только совпадения по ${marker}`}
                      />
                    </div>
                    {/* Название маркера */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'translateX(-50%) translateY(-50%) rotate(180deg)' }}>
                      {marker}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Match Results */}
            <tbody className="bg-white">
              {/* Query Profile Row */}
              {query && (
                <tr className="bg-blue-100 border-b-2 border-blue-400">
                  <td className="sticky left-0 bg-blue-100 border-r border-gray-300 px-2 py-2 text-center z-10 w-[100px] max-w-[100px]">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => copyHaplotype(query)}
                        className={`flex items-center justify-center p-1 rounded transition-colors ${copiedKitNumber === query.kitNumber
                          ? 'bg-green-200 text-green-800'
                          : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
                          }`}
                        title="Copy haplotype"
                      >
                        {copiedKitNumber === query.kitNumber ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Badge & Kit Number Row */}
                      <div className="flex items-center justify-center flex-wrap gap-0.5">
                        {getPanelBadge(query.markers)}
                        <span className="font-bold text-blue-800 text-sm">{query.kitNumber || 'Query'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="border-r border-gray-300 px-2 py-2 text-center w-[50px] max-w-[50px]">
                    {/* Empty cell for query row */}
                  </td>
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[150px] max-w-[150px]">
                    <span className="text-sm font-semibold">{query.name || 'Query Profile'}</span>
                  </td>
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[120px] max-w-[120px]">
                    <span
                      className="text-sm block truncate max-w-[110px]"
                      title={query.country || ''}
                    >
                      {query.country || ''}
                    </span>
                  </td>
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[180px] max-w-[180px]">
                    <span
                      className="text-sm font-mono text-purple-700 font-bold block truncate max-w-[170px]"
                      title={query.haplogroup || ''}
                    >
                      {query.haplogroup || ''}
                    </span>
                  </td>
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[60px] max-w-[60px]">
                    <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-green-500">0</span>
                  </td>
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[60px] max-w-[60px]">
                    <span className="text-sm font-semibold">{Object.keys(query.markers).length}</span>
                  </td>
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[60px] max-w-[60px]">
                    <span className="text-sm font-bold text-green-600">100.0</span>
                  </td>
                  {displayedMarkers.map((marker) => {
                    const queryValue = query.markers[marker];
                    if (!queryValue) {
                      return (
                        <td key={marker} className="border-r border-gray-300 px-0.5 py-1 text-center w-[35px] max-w-[35px] min-w-[35px]">
                          <span className="text-gray-400 text-xs">-</span>
                        </td>
                      );
                    }
                    const rarityClass = getRarityClass(marker, queryValue);
                    return (
                      <td key={marker} className="border-r border-gray-300 px-0.5 py-1 text-center w-[35px] max-w-[35px] min-w-[35px]">
                        <div className={`text-xs font-bold px-0.5 py-0.5 rounded ${rarityClass || 'bg-white'}`} title={`${marker}: ${queryValue}`}>
                          <span>-</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )}

              {filteredMatches.map((match, index) => (
                <tr
                  key={match.profile?.kitNumber || index}
                  className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                >
                  {/* Kit Number */}
                  <td className="sticky left-0 bg-inherit border-r border-gray-300 px-2 py-1 text-center z-10 w-[100px] max-w-[100px]">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => match.profile && copyHaplotype(match.profile)}
                        className={`flex items-center justify-center p-1 rounded transition-colors ${copiedKitNumber === match.profile?.kitNumber
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                          }`}
                        title="Copy haplotype"
                      >
                        {copiedKitNumber === match.profile?.kitNumber ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {/* Badge & Kit Number Row */}
                      <div className="flex items-center justify-center flex-wrap gap-0.5">
                        {match.profile && getPanelBadge(match.profile.markers)}
                        <div className="flex items-center">
                          {onKitNumberClick ? (
                            <button
                              onClick={() => match.profile?.kitNumber && onKitNumberClick(match.profile.kitNumber)}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors text-sm"
                              title="Click to search matches for this profile"
                            >
                              {match.profile?.kitNumber || 'N/A'}
                            </button>
                          ) : (
                            <span className="font-bold text-blue-600 text-sm">
                              {match.profile?.kitNumber || 'N/A'}
                            </span>
                          )}
                          {onEditProfile && (
                            <button
                              onClick={() => match.profile?.kitNumber && onEditProfile(match.profile.kitNumber)}
                              className="text-gray-400 hover:text-blue-600 transition-colors ml-0.5"
                              title="Edit profile"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Hide Button */}
                  <td className="border-r border-gray-300 px-1 py-1 text-center w-[50px] max-w-[50px]">
                    <button
                      onClick={() => match.profile?.kitNumber && toggleHideKitNumber(match.profile.kitNumber)}
                      className="text-red-600 hover:text-red-800 cursor-pointer font-bold text-lg leading-none"
                      title="Hide this sample"
                    >
                      ×
                    </button>
                  </td>

                  {/* Name */}
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[150px] max-w-[150px]">
                    <span className="text-sm">
                      {match.profile?.name || ''}
                    </span>
                  </td>

                  {/* Country */}
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[120px] max-w-[120px]">
                    <span
                      className="text-sm block truncate max-w-[110px]"
                      title={match.profile?.country || ''}
                    >
                      {match.profile?.country || ''}
                    </span>
                  </td>

                  {/* Haplogroup */}
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[180px] max-w-[180px]">
                    {match.profile?.haplogroup ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => match.profile?.haplogroup && onHaplogroupInfo?.(match.profile.haplogroup)}
                          className="text-sm font-mono text-purple-600 hover:text-purple-800 hover:underline cursor-pointer transition-colors truncate max-w-[130px]"
                          title={`View haplogroup info: ${match.profile.haplogroup}`}
                        >
                          {match.profile.haplogroup}
                        </button>
                        {onHaplogroupClick && (
                          <button
                            onClick={() => match.profile?.haplogroup && onHaplogroupClick(match.profile.haplogroup)}
                            className="text-xs px-1 py-0.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                            title={`Filter by haplogroup: ${match.profile.haplogroup}`}
                          >
                            1
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-mono text-purple-600"></span>
                    )}
                  </td>

                  {/* Genetic Distance */}
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[60px] max-w-[60px]">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold text-white ${match.distance === 0
                        ? 'bg-green-500'
                        : match.distance <= 2
                          ? 'bg-blue-500'
                          : match.distance <= 5
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                    >
                      {match.distance}
                    </span>
                  </td>

                  {/* STR Count */}
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[60px] max-w-[60px]">
                    <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-blue-500">
                      {match.comparedMarkers}
                    </span>
                  </td>

                  {/* Match Percentage */}
                  <td className="border-r border-gray-300 px-2 py-1 text-center w-[60px] max-w-[60px]">
                    <span className="text-sm font-bold text-green-600">
                      {typeof match.percentIdentical === 'number'
                        ? `${match.percentIdentical.toFixed(1)}`
                        : `${match.percentIdentical}`}
                    </span>
                  </td>

                  {/* Marker values with differences */}
                  {displayedMarkers.map((marker) => {
                    const queryValue = query?.markers[marker];
                    const matchValue = match.profile?.markers[marker];

                    if (!matchValue || !queryValue) {
                      return (
                        <td key={marker} className="border-r border-gray-300 px-0.5 py-1 text-center w-[35px] max-w-[35px] min-w-[35px]">
                          <span className="text-gray-400 text-xs">-</span>
                        </td>
                      );
                    }

                    const isPalindrome = marker in palindromes;
                    const diff = calculateMarkerDifference(queryValue, matchValue, marker, isPalindrome, { type: 'standard' });
                    const rarityClass = getRarityClass(marker, queryValue);

                    return (
                      <td key={marker} className="border-r border-gray-300 px-0.5 py-1 text-center w-[35px] max-w-[35px] min-w-[35px]">
                        <div
                          className={`text-xs font-bold px-0.5 py-0.5 rounded ${diff === 0
                            ? rarityClass || 'bg-white'
                            : 'bg-white'
                            }`}
                          title={`${marker}: ${matchValue}`}
                        >
                          {!isNaN(diff) && diff > 0 ? (
                            <span className={diff === 1 ? 'text-orange-600' : diff === 2 ? 'text-red-600' : 'text-red-800'}>
                              {Number(matchValue) > Number(queryValue) ? `+${diff}` : `-${diff}`}
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Beautiful Legend */}
      <div className="bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 rounded-2xl p-6 border border-blue-700/50 shadow-2xl">
        <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-yellow-400">📊</span>
          Legend & Guide
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-bold text-sm text-blue-200 mb-3 flex items-center gap-2">
              <span>🎯</span>
              Genetic Distance:
            </h5>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg">0 Perfect</span>
              <span className="px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg">1-2 Close</span>
              <span className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg">3-5 Moderate</span>
              <span className="px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl text-sm font-bold shadow-lg">6+ Distant</span>
            </div>
          </div>
          <div>
            <h5 className="font-bold text-sm text-purple-200 mb-3 flex items-center gap-2">
              <span>🧬</span>
              Marker Rarity:
            </h5>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg">≤4% Ultra Rare</span>
              <span className="px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg">≤8% Very Rare</span>
              <span className="px-3 py-2 bg-orange-300 text-gray-900 rounded-xl text-sm font-bold shadow-lg">≤15% Rare</span>
              <span className="px-3 py-2 bg-yellow-200 text-gray-900 rounded-xl text-sm font-bold shadow-lg">≤25% Uncommon</span>
              <span className="px-3 py-2 bg-green-100 text-gray-900 rounded-xl text-sm font-bold shadow-lg">&gt;25% Common</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedMatchesTable;