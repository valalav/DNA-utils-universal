import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '../ui/button';

interface HaplogroupFilterProps {
    id?: string;
    filterHaplogroup: string;
    setFilterHaplogroup: (value: string) => void;
    includeSubclades: boolean;
    setIncludeSubclades: (value: boolean) => void;
    showEmptyHaplogroups: boolean;
    setShowEmptyHaplogroups: (value: boolean) => void;
    onApplyFilter: () => void;
    onKeepFilteredOnly: () => void;
    onRemoveFiltered: () => void;
    onResetFilter: () => void;
}

export const HaplogroupFilter: React.FC<HaplogroupFilterProps> = ({
    id,
    filterHaplogroup,
    setFilterHaplogroup,
    includeSubclades,
    setIncludeSubclades,
    showEmptyHaplogroups,
    setShowEmptyHaplogroups,
    onApplyFilter,
    onKeepFilteredOnly,
    onRemoveFiltered,
    onResetFilter
}) => {
    const { t } = useTranslation();
    const [tempFilter, setTempFilter] = useState(filterHaplogroup);
    const inputId = `${id}-haplogroup-input`;
    const checkboxId = `${id}-include-subclades`;

    const handleApplyFilter = () => {
        setFilterHaplogroup(tempFilter);
        onApplyFilter();
    };

    return (
        <div className="space-y-4 p-4 bg-background-secondary rounded-lg">
            <div className="flex items-center gap-2">
                <div className="flex-grow relative">
                    {tempFilter && (
                        <button
                            onClick={onResetFilter}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            title={t('common.reset')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                    <input
                        type="text"
                        value={tempFilter}
                        onChange={(e) => setTempFilter(e.target.value)}
                        placeholder={t('haplogroups.enterHaplogroup')}
                        className={`input-primary w-full ${tempFilter ? 'pl-8' : ''}`}
                    />
                </div>
                <button
                    onClick={handleApplyFilter}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover"
                >
                    {t('haplogroups.applyFilter')}
                </button>
                <Button 
                    onClick={onKeepFilteredOnly}
                    variant="outline"
                    className="whitespace-nowrap"
                >
                    {t('haplogroups.keepFilteredOnly')}
                </Button>
                <Button 
                    onClick={onRemoveFiltered}
                    variant="outline"
                    className="whitespace-nowrap"
                >
                    {t('haplogroups.removeFiltered')}
                </Button>
            </div>
            
            <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id={checkboxId}
                        checked={includeSubclades}
                        onCheckedChange={(checked) => {
                            if (typeof checked === 'boolean') {
                                setIncludeSubclades(checked);
                            }
                        }}
                    />
                    <label htmlFor={checkboxId} className="text-sm">
                        {t('haplogroups.includeSubclades')}
                    </label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id={`${id}-show-empty`}
                        checked={showEmptyHaplogroups}
                        onCheckedChange={(checked) => {
                            if (typeof checked === 'boolean') {
                                setShowEmptyHaplogroups(checked);
                            }
                        }}
                    />
                    <label htmlFor={`${id}-show-empty`} className="text-sm">
                        {t('haplogroups.showEmpty')}
                    </label>
                </div>

            </div>
        </div>
    );
}; 