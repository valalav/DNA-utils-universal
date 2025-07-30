import React, { useState, useEffect } from 'react';
import apiClient from '../api-client';
import { FilterPanel, CountrySelector } from './HaploFilters';
import { HaploTree } from './HaploCharts';
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react';

function HaploViewer() {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [searchHistory, setSearchHistory] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showGeography, setShowGeography] = useState(false);
    const [showVariants, setShowVariants] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const savedHistory = localStorage.getItem('searchHistory');
        if (savedHistory) {
            setSearchHistory(JSON.parse(savedHistory));
        }
    }, []);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchTerm.length < 2) {
                setSuggestions([]);
                return;
            }

            try {
                const response = await apiClient.get('/autocomplete', {
                    params: {
                        term: searchTerm,
                        limit: 10
                    }
                });
                
                if (response.data && Array.isArray(response.data)) {
                    setSuggestions(response.data);
                } else {
                    setSuggestions([]);
                }
            } catch (err) {
                console.error('Error fetching suggestions:', err);
                setSuggestions([]);
                if (err.response) {
                    if (err.response.status === 404) {
                        setError('Сервер не найден. Проверьте настройки API.');
                    } else {
                        setError('Ошибка сервера: ' + err.response.data?.error || 'Неизвестная ошибка');
                    }
                } else if (err.request) {
                    setError('Ошибка сети - ответ не получен');
                } else {
                    setError('Ошибка при настройке запроса: ' + err.message);
                }
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handleSearch = async (term) => {
        setIsLoading(true);
        setError('');
        
        try {
            const searchUrl = `/search/${encodeURIComponent(term)}`;
            console.log('Search details:', {
                term: term,
                encodedTerm: encodeURIComponent(term),
                url: searchUrl,
                baseURL: apiClient.defaults.baseURL
            });
            
            const response = await apiClient.get(searchUrl);
            console.log('Search response:', {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data
            });
            
            if (response.data) {
                setResult(response.data);
                const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
                setSearchHistory(newHistory);
                localStorage.setItem('searchHistory', JSON.stringify(newHistory));
            }
        } catch (error) {
            console.error('Search error:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            setError(error.response?.data?.error || 'An unexpected error occurred.');
            setResult(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilter = async (filters) => {
        setIsLoading(true);
        try {
            const response = await apiClient.post('/haplogroups/filter', {
                ...filters,
                countries: selectedCountries
            });
            if (response.data) {
                setResult({ filteredResults: response.data });
            }
        } catch (err) {
            console.error('Filter error:', err);
            setError(err.response?.data?.error || 'An unexpected error occurred while filtering.');
        } finally {
            setIsLoading(false);
        }
    };

    const getExternalUrl = (haplogroup, source) => {
        if (!haplogroup || typeof haplogroup !== 'string') return '#';
        return source === 'ftdna' 
            ? `https://discover.familytreedna.com/y-dna/${haplogroup}/classic`
            : `https://www.yfull.com/tree/${haplogroup}/`;
    };

    const Tooltip = ({ text, children }) => (
        <div className="group relative inline-block">
            {children}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-sm bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {text}
            </div>
        </div>
    );

    const SourceBadge = ({ source, matchInfo }) => (
        <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                source === 'ftdna' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
                {source.toUpperCase()}
            </span>
            {matchInfo && matchInfo.confidence < 1 && (
                <Tooltip text={`Found through ${matchInfo.matchType === 'alternative_snp' ? 'alternative SNP' : 'path SNP'}: ${matchInfo.matchedSNP} (${Math.round(matchInfo.confidence * 100)}% match)`}>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                </Tooltip>
            )}
        </div>
    );

    const MatchingInfo = ({ details }) => {
        if (!details || !details.matchInfo || details.matchInfo.confidence === 1) return null;
        
        return (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span>Matched through alternative SNP</span>
                </div>
                <div className="mt-1 text-gray-600">
                    <div>Matched SNP: {details.matchInfo.matchedSNP}</div>
                    <div>Confidence: {Math.round(details.matchInfo.confidence * 100)}%</div>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {/* Search Box */}
                    <div className="bg-white p-4 rounded-lg shadow mb-6">
                        <div className="relative">
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Enter SNP or haplogroup name"
                                className="w-full p-2 border rounded"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch(searchTerm);
                                    }
                                }}
                            />
                            
                            {suggestions.length > 0 && (
                                <div className="absolute w-full bg-white border mt-1 rounded shadow-lg z-10">
                                    {suggestions.map((suggestion, index) => (
                                        <div
                                            key={index}
                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                            onClick={() => {
                                                setSearchTerm(suggestion.value);
                                                handleSearch(suggestion.value);
                                                setSuggestions([]);
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{suggestion.value}</span>
                                                <div className="flex gap-1">
                                                    {suggestion.sources.map(source => (
                                                        <SourceBadge key={source} source={source} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {suggestion.haplogroup}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <button 
                                onClick={() => handleSearch(searchTerm)}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Searching...' : 'Search'}
                            </button>
                        </div>
                    </div>

                    {/* Search History */}
                    {searchHistory.length > 0 && (
                        <div className="bg-white p-4 rounded-lg shadow mb-6">
                            <h3 className="font-medium mb-2">Recent Searches</h3>
                            <div className="flex flex-wrap gap-2">
                                {searchHistory.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSearch(item)}
                                        className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold">{result.name}</h2>
                                    <div className="flex gap-2">
                                        <a
                                            href={getExternalUrl(result.name, 'ftdna')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            FTDNA <ExternalLink className="w-4 h-4 ml-1" />
                                        </a>
                                        <a
                                            href={getExternalUrl(result.name, 'yfull')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-sm text-green-600 hover:text-green-800"
                                        >
                                            YFull <ExternalLink className="w-4 h-4 ml-1" />
                                        </a>
                                    </div>
                                </div>

                                {/* Paths Section */}
                                <div className="mb-6">
                                    <h3 className="font-medium mb-3">Haplogroup Paths</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* FTDNA Path */}
                                        {result.ftdnaDetails?.path && (
                                            <div className="border rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <SourceBadge 
                                                        source="ftdna" 
                                                        matchInfo={result.ftdnaDetails.matchInfo}
                                                    />
                                                    <a
                                                        href={result.ftdnaDetails.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                                <div className="text-sm text-gray-600 break-words">
                                                    {result.ftdnaDetails?.path?.nodes && result.ftdnaDetails.path.nodes.map((node, index) => (
                                                        <span key={node.id}>
                                                            <span 
                                                                className="hover:text-blue-600 cursor-pointer"
                                                                onClick={() => handleSearch(node.name)}
                                                            >
                                                                {node.name}
                                                            </span>
                                                            {index < result.ftdnaDetails.path.nodes.length - 1 && ' > '}
                                                        </span>
                                                    ))}
                                                </div>
                                                <MatchingInfo details={result.ftdnaDetails} />
                                            </div>
                                        )}

                                        {/* YFull Path */}
                                        {result.yfullDetails?.path && (
                                            <div className="border rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <SourceBadge 
                                                        source="yfull"
                                                        matchInfo={result.yfullDetails.matchInfo}
                                                    />
                                                    <a
                                                        href={result.yfullDetails.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-green-600 hover:text-green-800"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                                <div className="text-sm text-gray-600 break-words">
                                                    {result.yfullDetails?.path?.nodes && result.yfullDetails.path.nodes.map((node, index) => (
                                                        <span key={node.id}>
                                                            <span 
                                                                className="hover:text-green-600 cursor-pointer"
                                                                onClick={() => handleSearch(node.name)}
                                                            >
                                                                {node.name}
                                                            </span>
                                                            {index < result.yfullDetails.path.nodes.length - 1 && ' > '}
                                                        </span>
                                                    ))}
                                                </div>
                                                <MatchingInfo details={result.yfullDetails} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Statistics Section */}
                                <div className="mb-6">
                                    <h3 className="font-medium mb-3">Statistics</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* FTDNA Statistics */}
                                        {result.ftdnaDetails?.statistics && (
                                            <div className="border rounded-lg p-3">
                                                <div className="flex items-center mb-2">
                                                    <SourceBadge source="ftdna" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-gray-600">Kits:</span>
                                                        <span className="ml-2 font-medium">
                                                            {result.ftdnaDetails.statistics.kitsCount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Sub-branches:</span>
                                                        <span className="ml-2 font-medium">
                                                            {result.ftdnaDetails.statistics.subBranches.toLocaleString()}
															                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* YFull Statistics */}
                                        {result.yfullDetails?.statistics && (
                                            <div className="border rounded-lg p-3">
                                                <div className="flex items-center mb-2">
                                                    <SourceBadge source="yfull" />
                                                </div>
                                                <div className="space-y-2">
                                                    {result.yfullDetails.statistics.tmrca && (
                                                        <div>
                                                            <span className="text-gray-600">TMRCA:</span>
                                                            <span className="ml-2 font-medium">
                                                                {result.yfullDetails.statistics.tmrca.toLocaleString()} years ago
                                                            </span>
                                                        </div>
                                                    )}
                                                    {result.yfullDetails.statistics.formed && (
                                                        <div>
                                                            <span className="text-gray-600">Formed:</span>
                                                            <span className="ml-2 font-medium">
                                                                {result.yfullDetails.statistics.formed.toLocaleString()} years ago
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Variants Section */}
                                {(result.ftdnaDetails?.variants || result.yfullDetails?.variants) && (
                                    <div className="mb-6">
                                        <button
                                            className="flex items-center justify-between w-full text-left font-medium mb-3"
                                            onClick={() => setShowVariants(!showVariants)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>Variants</span>
                                                <div className="flex gap-1 text-sm">
                                                    {result.ftdnaDetails?.variants && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                                            FTDNA: {result.ftdnaDetails.variants.length}
                                                        </span>
                                                    )}
                                                    {result.yfullDetails?.variants && (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                                            YFull: {result.yfullDetails.variants.length}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {showVariants ? (
                                                <ChevronUp className="w-5 h-5" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5" />
                                            )}
                                        </button>
                                        
                                        {showVariants && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* FTDNA Variants */}
                                                    {result.ftdnaDetails?.variants && (
                                                        <div className="border rounded-lg p-3">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <SourceBadge source="ftdna" />
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {result.ftdnaDetails.variants.map((variant, index) => (
                                                                    <button
                                                                        key={`ftdna-${index}`}
                                                                        onClick={() => handleSearch(variant.snp || variant.variant)}
                                                                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm hover:bg-blue-100 transition-colors"
                                                                    >
                                                                        {variant.snp || variant.variant}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* YFull Variants */}
                                                    {result.yfullDetails?.variants && (
                                                        <div className="border rounded-lg p-3">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <SourceBadge source="yfull" />
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {result.yfullDetails.variants.map((variant, index) => (
                                                                    <Tooltip
                                                                        key={`yfull-${index}`}
                                                                        text={variant.alternativeNames?.length ? 
                                                                            `Also known as: ${variant.alternativeNames.join(', ')}` : undefined}
                                                                    >
                                                                        <button
                                                                            onClick={() => handleSearch(variant.variant)}
                                                                            className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm hover:bg-green-100 transition-colors flex items-center gap-1"
                                                                        >
                                                                            {variant.variant}
                                                                            {variant.alternativeNames?.length > 0 && (
                                                                                <span className="text-xs text-green-500 ml-1">
                                                                                    +{variant.alternativeNames.length}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    </Tooltip>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Variant Details (Collapsible) */}
                                                <div className="border rounded-lg">
                                                    <button
                                                        onClick={() => setShowDetails(!showDetails)}
                                                        className="w-full p-3 flex items-center justify-between text-left font-medium"
                                                    >
                                                        <span>Variant Details</span>
                                                        {showDetails ? (
                                                            <ChevronUp className="w-5 h-5" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                    
                                                    {showDetails && (
                                                        <div className="p-3 border-t">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {result.ftdnaDetails?.variants && (
                                                                    <div>
                                                                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                                            <SourceBadge source="ftdna" />
                                                                            <span>Coordinates</span>
                                                                        </h5>
                                                                        <div className="space-y-1 text-sm">
                                                                            {result.ftdnaDetails.variants.map((variant, index) => (
                                                                                <div key={index} className="flex justify-between">
                                                                                    <span className="font-medium">
                                                                                        {variant.snp || variant.variant}:
                                                                                    </span>
                                                                                    <span>
                                                                                        {variant.position || 'Unknown'}
                                                                                        {variant.ancestral && variant.derived && (
                                                                                            <span className="ml-2 text-gray-500">
                                                                                                ({variant.ancestral}→{variant.derived})
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {result.yfullDetails?.variants && (
                                                                    <div>
                                                                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                                            <SourceBadge source="yfull" />
                                                                            <span>Alternative Names</span>
                                                                        </h5>
                                                                        <div className="space-y-1 text-sm">
                                                                            {result.yfullDetails.variants
                                                                                .filter(v => v.alternativeNames?.length)
                                                                                .map((variant, index) => (
                                                                                    <div key={index} className="flex justify-between">
                                                                                        <span className="font-medium">{variant.variant}:</span>
                                                                                        <span className="text-gray-500">
                                                                                            {variant.alternativeNames.join(', ')}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Direct Descendants Section */}
                                {(result.ftdnaDetails?.children || result.yfullDetails?.children) && (
                                    <div className="mb-6">
                                        <h3 className="font-medium mb-3">Direct Descendants</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* FTDNA Descendants */}
                                            {result.ftdnaDetails?.children && result.ftdnaDetails.children.length > 0 && (
                                                <div className="border rounded-lg p-3">
                                                    <div className="flex items-center mb-2">
                                                        <SourceBadge source="ftdna" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        {result.ftdnaDetails.children.map((child, index) => (
                                                            <div
                                                                key={index}
                                                                className="p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100"
                                                                onClick={() => handleSearch(child.name)}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-medium">{child.name}</span>
                                                                    <a
                                                                        href={getExternalUrl(child.name, 'ftdna')}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:text-blue-800"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* YFull Descendants */}
                                            {result.yfullDetails?.children && result.yfullDetails.children.length > 0 && (
                                                <div className="border rounded-lg p-3">
                                                    <div className="flex items-center mb-2">
                                                        <SourceBadge source="yfull" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        {result.yfullDetails.children.map((child, index) => (
                                                            <div
                                                                key={index}
                                                                className="p-2 bg-green-50 rounded cursor-pointer hover:bg-green-100"
                                                                onClick={() => handleSearch(child.name)}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-medium">{child.name}</span>
                                                                    <a
                                                                        href={getExternalUrl(child.name, 'yfull')}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-green-600 hover:text-green-800"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </a>
                                                                </div>
                                                                {child.tmrca && (
                                                                    <div className="text-sm text-gray-600">
                                                                        TMRCA: {child.tmrca.toLocaleString()} years ago
                                                                    </div>
                                                                )}
                                                                {child.formed && (
                                                                    <div className="text-sm text-gray-600">
                                                                        Formed: {child.formed.toLocaleString()} years ago
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Geography Section */}
                                {result.ftdnaDetails?.geography?.countries && (
                                    <div className="mb-6">
                                        <button
                                            className="flex items-center justify-between w-full text-left font-medium mb-3"
                                            onClick={() => setShowGeography(!showGeography)}
                                        >
                                            <span>Geographic Distribution</span>
                                            {showGeography ? (
                                                <ChevronUp className="w-5 h-5" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5" />
                                            )}
                                        </button>
                                        
                                        {showGeography && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {result.ftdnaDetails.geography.countries.map((country, index) => (
                                                    <div 
                                                        key={index}
                                                        className="flex justify-between p-2 bg-gray-50 rounded"
                                                    >
                                                        <span>{country.name}</span>
                                                        <span className="font-medium">{country.count.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                    {(result.ftdnaDetails?.treeData || result.yfullDetails?.treeData) && (
                                        <div className="mt-6 flex flex-col space-y-6">
                                            {result.ftdnaDetails?.treeData && (
                                                <div>
                                                    <h3 className="font-medium mb-3">FTDNA Haplogroup Tree</h3>
                                                    <HaploTree data={result.ftdnaDetails.treeData} />
                                                </div>
                                            )}
                                            {result.yfullDetails?.treeData && (
                                                <div>
                                                    <h3 className="font-medium mb-3">YFull Haplogroup Tree</h3>
                                                    <HaploTree data={result.yfullDetails.treeData} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sidebar */}
                                            <div className="space-y-6">
                                                <FilterPanel onApplyFilters={handleFilter} />
                                                <CountrySelector
                                                    selectedCountries={selectedCountries}
                                                    onCountryChange={setSelectedCountries}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                                }

export default HaploViewer;