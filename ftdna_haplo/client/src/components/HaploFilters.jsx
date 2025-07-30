import React, { useState } from 'react';

export const FilterPanel = ({ onApplyFilters }) => {
    const [filters, setFilters] = useState({
        minKits: 0,
        rootHaplogroup: '',
        minSubBranches: 0
    });

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium mb-4">Filters</h3>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Minimum Kits
                    </label>
                    <input
                        type="number"
                        value={filters.minKits}
                        onChange={(e) => setFilters({
                            ...filters,
                            minKits: parseInt(e.target.value) || 0
                        })}
                        className="w-full p-2 border rounded"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        Root Haplogroup
                    </label>
                    <input
                        type="text"
                        value={filters.rootHaplogroup}
                        onChange={(e) => setFilters({
                            ...filters,
                            rootHaplogroup: e.target.value
                        })}
                        className="w-full p-2 border rounded"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        Minimum Sub-branches
                    </label>
                    <input
                        type="number"
                        value={filters.minSubBranches}
                        onChange={(e) => setFilters({
                            ...filters,
                            minSubBranches: parseInt(e.target.value) || 0
                        })}
                        className="w-full p-2 border rounded"
                    />
                </div>

                <button
                    onClick={() => onApplyFilters(filters)}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Apply Filters
                </button>
            </div>
        </div>
    );
};

export const CountrySelector = ({ selectedCountries, onCountryChange }) => {
    const commonCountries = [
        { code: 'USA', name: 'United States' },
        { code: 'GBR', name: 'United Kingdom' },
        { code: 'DEU', name: 'Germany' },
        { code: 'FRA', name: 'France' },
        { code: 'ITA', name: 'Italy' },
        { code: 'ESP', name: 'Spain' },
        { code: 'POL', name: 'Poland' },
        { code: 'RUS', name: 'Russia' },
        { code: 'CHN', name: 'China' },
        { code: 'JPN', name: 'Japan' }
    ];

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium mb-4">Select Countries</h3>
            <div className="grid grid-cols-2 gap-2">
                {commonCountries.map(country => (
                    <label key={country.code} className="flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedCountries.includes(country.code)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    onCountryChange([...selectedCountries, country.code]);
                                } else {
                                    onCountryChange(selectedCountries.filter(c => c !== country.code));
                                }
                            }}
                            className="mr-2"
                        />
                        {country.name}
                    </label>
                ))}
            </div>
        </div>
    );
};

export const SearchHistory = ({ history, onSearch }) => {
    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium mb-4">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
                {history.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => onSearch(item)}
                        className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                    >
                        {item}
                    </button>
                ))}
            </div>
        </div>
    );
};