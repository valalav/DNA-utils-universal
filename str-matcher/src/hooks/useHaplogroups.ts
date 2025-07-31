import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

export const useHaplogroups = () => {
    const [filterHaplogroup, setFilterHaplogroup] = useState<string>('');
    const [includeSubclades, setIncludeSubclades] = useState<boolean>(true);
    const [showEmptyHaplogroups, setShowEmptyHaplogroups] = useState<boolean>(true);
    const resultsCache = useRef(new Map<string, boolean>());

    const checkHaplogroupMatch = async (haplogroup: string): Promise<boolean> => {
        // Если нет фильтра, показываем все
        if (!filterHaplogroup) return true;

        // Если гаплогруппа пустая
        if (!haplogroup) {
            return showEmptyHaplogroups;
        }

        // Если гаплогруппы совпадают
        if (haplogroup === filterHaplogroup) return true;

        // Если включен режим подклад
        if (includeSubclades) {
            const cacheKey = `${haplogroup}-${filterHaplogroup}`;
            if (resultsCache.current.has(cacheKey)) {
                return resultsCache.current.get(cacheKey)!;
            }

            try {
                const response = await axios.post(`${API_URL}/check-subclade`, {
                    haplogroup,
                    parentHaplogroup: filterHaplogroup
                });

                const isSubclade = response.data.isSubclade;
                resultsCache.current.set(cacheKey, isSubclade);
                return isSubclade;
            } catch (error) {
                console.error('Error checking subclade:', error);
                return false;
            }
        }
        
        return haplogroup === filterHaplogroup;
    };

    // Очищаем кэш при изменении параметров фильтрации
    useEffect(() => {
        resultsCache.current.clear();
    }, [filterHaplogroup, includeSubclades, showEmptyHaplogroups]);

    return {
        filterHaplogroup,
        setFilterHaplogroup,
        includeSubclades,
        setIncludeSubclades,
        showEmptyHaplogroups,
        setShowEmptyHaplogroups,
        checkHaplogroupMatch
    };
}; 