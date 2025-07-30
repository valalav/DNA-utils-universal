class HaploTree {
    constructor(jsonData) {
        this.data = jsonData;
        this.haplogroups = jsonData.allNodes || {};
        this.variantToHaplogroup = new Map();
        this.nameToHaplogroup = new Map();
        this.initializeIndices();
    }

    initializeIndices() {
        for (const [id, haplo] of Object.entries(this.haplogroups)) {
            if (haplo && haplo.variants && Array.isArray(haplo.variants)) {
                for (const variantObj of haplo.variants) {
                    if (variantObj.variant) {
                        this.variantToHaplogroup.set(variantObj.variant.toUpperCase(), id);
                    }
                }
            }
            if (haplo && haplo.name) {
                this.nameToHaplogroup.set(haplo.name.toUpperCase(), id);
            }
        }
        console.log(`Indexed ${this.variantToHaplogroup.size} variants`);
    }

    findHaplogroup(term) {
        console.log('Searching for:', term);
        
        // Точное совпадение по варианту SNP
        const haploIdByVariant = this.variantToHaplogroup.get(term.toUpperCase());
        if (haploIdByVariant) {
            console.log('Found by variant:', haploIdByVariant);
            return this.haplogroups[haploIdByVariant];
        }
    
        // Точное совпадение по имени гаплогруппы
        const haploIdByName = this.nameToHaplogroup.get(term.toUpperCase());
        if (haploIdByName) {
            console.log('Found by name:', haploIdByName);
            return this.haplogroups[haploIdByName];
        }
    
        return null;
    }

    searchWithAutocomplete(term, limit = 10) {
        const upperTerm = term.toUpperCase();
        const results = [];

        for (const [variant, haploId] of this.variantToHaplogroup.entries()) {
            if (variant.includes(upperTerm)) {
                const haplo = this.haplogroups[haploId];
                results.push({
                    type: 'SNP',
                    value: variant,
                    haplogroup: haplo.name
                });
                if (results.length >= limit) break;
            }
        }

        for (const [name, haploId] of this.nameToHaplogroup.entries()) {
            if (name.includes(upperTerm)) {
                results.push({
                    type: 'Haplogroup',
                    value: name,
                    haplogroup: name
                });
                if (results.length >= limit) break;
            }
        }

        return results;
    }

    getHaplogroupDetails(haplogroupId) {
        const haplo = this.haplogroups[haplogroupId];
        if (!haplo) return null;
    
        const getTotalKits = (nodeId) => {
            const node = this.haplogroups[nodeId];
            if (!node) return 0;
            
            let total = node.kitsCount || 0;
            if (node.children) {
                total += node.children.reduce((sum, childId) => 
                    sum + getTotalKits(childId), 0);
            }
            return total;
        };
    
        const getCountryStats = (nodeId, countryMap = new Map()) => {
            const node = this.haplogroups[nodeId];
            if (!node) return countryMap;
    
            if (node.countryCounts) {
                node.countryCounts.forEach(c => {
                    const current = countryMap.get(c.countryCode) || 0;
                    countryMap.set(c.countryCode, current + c.kitsCounts);
                });
            }
    
            if (node.children) {
                node.children.forEach(childId => 
                    getCountryStats(childId, countryMap));
            }
    
            return countryMap;
        };
    
        const getHaplogroupPath = (nodeId) => {
            const path = [];
            let current = this.haplogroups[nodeId];
            
            while (current) {
                // Берем из variants все возможные варианты SNP
                const snps = current.variants?.map(v => v.variant || v.snp).filter(Boolean) || [];
                const mainSnp = snps[0] || '';
                path.push({
                    id: current.haplogroupId,
                    name: current.name,
                    variants: snps,
                    displayName: `${current.name}-${mainSnp}`
                });
                
                if (!current.parentId) break;
                current = this.haplogroups[current.parentId];
            }
            
            return path.reverse();
        };
    
        const totalKits = getTotalKits(haplogroupId);
        const countryMap = getCountryStats(haplogroupId);
        const path = getHaplogroupPath(haplogroupId);
    
        const countryStats = Array.from(countryMap.entries())
            .map(([code, count]) => {
                const countryInfo = haplo.countryCounts?.find(c => c.countryCode === code);
                return {
                    code: code,
                    name: countryInfo?.name || code,
                    count: count
                };
            })
            .sort((a, b) => b.count - a.count);
    
        return {
            id: haplo.haplogroupId,
            name: haplo.name,
            path: {
                nodes: path,
                string: path.map(p => p.displayName).join(' > ')
            },
            
            // Обрабатываем возможные форматы вариантов
            variants: haplo.variants?.map(v => ({
                snp: v.variant || v.snp,
                variant: v.variant || v.snp,  // Добавляем для совместимости
                position: v.position,
                ancestral: v.ancestral,
                derived: v.derived,
                region: v.region
            })) || [],
            statistics: {
                kitsCount: totalKits,
                subBranches: haplo.subBranches,
                bigYCount: haplo.bigYCount || 0
            },
            geography: {
                countries: countryStats
            },
            hierarchy: {
                parentId: haplo.parentId,
                children: haplo.children || [],
                isRoot: haplo.isRoot,
                root: haplo.root
            }
        };
    }

    getSubtree(haplogroupId) {
        const haplo = this.haplogroups[haplogroupId];
        if (!haplo) return null;
        return this._buildFullSubtree(haplo);
    }

    _buildFullSubtree(haplo) {
        if (!haplo) return null;

        const node = {
            id: haplo.haplogroupId,
            name: haplo.name,
            kitsCount: haplo.kitsCount || 0,
            children: []
        };

        if (haplo.children && Array.isArray(haplo.children)) {
            node.children = haplo.children
                .map(childId => {
                    const childHaplo = this.haplogroups[childId];
                    return this._buildFullSubtree(childHaplo);
                })
                .filter(child => child !== null)
                .sort((a, b) => {
                    const totalA = this.calculateTotalKits(a);
                    const totalB = this.calculateTotalKits(b);
                    return totalB - totalA;
                });
        }

        return node;
    }

    calculateTotalKits(node) {
        if (!node) return 0;
        let total = node.kitsCount || 0;
        if (node.children && Array.isArray(node.children)) {
            total += node.children.reduce((sum, child) => sum + this.calculateTotalKits(child), 0);
        }
        return total;
    }

    getAncestryWithSiblings(haplogroupId) {
        const chain = [];
        let current = this.haplogroups[haplogroupId];
        
        while (current) {
            const siblings = current.parentId ? 
                this.haplogroups[current.parentId].children
                    .map(id => this.haplogroups[id])
                    .filter(h => h.haplogroupId !== current.haplogroupId) : 
                [];

            chain.push({
                current: {
                    id: current.haplogroupId,
                    name: current.name,
                    kitsCount: current.kitsCount
                },
                siblings: siblings.map(s => ({
                    id: s.haplogroupId,
                    name: s.name,
                    kitsCount: s.kitsCount
                }))
            });

            if (!current.parentId) break;
            current = this.haplogroups[current.parentId];
        }
        
        return chain.reverse();
    }

    getTreeStatistics(haplogroupId) {
        const haplo = this.haplogroups[haplogroupId];
        if (!haplo) return null;

        const stats = {
            totalKits: 0,
            maxDepth: 0,
            branchCount: 0,
            distributionByLevel: new Map()
        };

        const processNode = (node, depth = 0) => {
            stats.totalKits += node.kitsCount || 0;
            stats.maxDepth = Math.max(stats.maxDepth, depth);
            stats.branchCount++;

            const currentLevel = stats.distributionByLevel.get(depth) || 0;
            stats.distributionByLevel.set(depth, currentLevel + (node.kitsCount || 0));

            if (node.children) {
                node.children.forEach(childId => {
                    const child = this.haplogroups[childId];
                    if (child) {
                        processNode(child, depth + 1);
                    }
                });
            }
        };

        processNode(haplo);

        return {
            ...stats,
            distributionByLevel: Object.fromEntries(stats.distributionByLevel)
        };
    }

    filterHaplogroups(filters) {
        const results = [];
        
        for (const [id, haplo] of Object.entries(this.haplogroups)) {
            let matches = true;

            if (filters.minKits && haplo.kitsCount < filters.minKits) {
                matches = false;
            }

            if (filters.countries && filters.countries.length > 0) {
                const hasCountry = haplo.countryCounts?.some(c => 
                    filters.countries.includes(c.countryCode)
                );
                if (!hasCountry) matches = false;
            }

            if (filters.rootHaplogroup && haplo.root !== filters.rootHaplogroup) {
                matches = false;
            }

            if (filters.minSubBranches && haplo.subBranches < filters.minSubBranches) {
                matches = false;
            }

            if (matches) {
                results.push({
                    id: haplo.haplogroupId,
                    name: haplo.name,
                    kitsCount: haplo.kitsCount,
                    countries: haplo.countryCounts,
                    variants: haplo.variants?.map(v => v.variant) || [],
                    root: haplo.root
                });
            }
        }

        return results;
    }

    getRegionalStatistics() {
        const regions = new Map();
        const regionCountries = {
            'Europe': ['ENG', 'GBR', 'DEU', 'FRA', 'ITA', 'ESP', 'PL', 'UKR', 'RUS'],
            'Asia': ['CHN', 'JPN', 'KOR', 'IND', 'PAK', 'IRN'],
            'Americas': ['USA', 'CAN', 'MEX', 'BRA', 'ARG'],
            'Africa': ['EGY', 'MAR', 'ZAF', 'NGA', 'KEN'],
            'Oceania': ['AUS', 'NZL']
        };

        Object.keys(regionCountries).forEach(region => {
            regions.set(region, {
                totalKits: 0,
                haplogroups: new Set(),
                dominantHaplogroups: new Map()
            });
        });

        for (const haplo of Object.values(this.haplogroups)) {
            if (!haplo.countryCounts) continue;

            for (const country of haplo.countryCounts) {
                for (const [region, countries] of Object.entries(regionCountries)) {
                    if (countries.includes(country.countryCode)) {
                        const regionData = regions.get(region);
                        regionData.totalKits += country.kitsCounts;
                        regionData.haplogroups.add(haplo.root);

                        const current = regionData.dominantHaplogroups.get(haplo.root) || 0;
                        regionData.dominantHaplogroups.set(haplo.root, current + country.kitsCounts);
                    }
                }
            }
        }

        const results = {};
        for (const [region, data] of regions) {
            results[region] = {
                totalKits: data.totalKits,
                uniqueHaplogroups: data.haplogroups.size,
                dominant: Array.from(data.dominantHaplogroups.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([haplo, count]) => ({
                        haplogroup: haplo,
                        count,
                        percentage: (count / data.totalKits * 100).toFixed(1)
                    }))
            };
        }

        return results;
    }

    getMigrationPatterns(haplogroupId) {
        const haplo = this.haplogroups[haplogroupId];
        if (!haplo) return null;

        const migrations = [];
        let current = haplo;
        const processedCountries = new Set();

        while (current) {
            if (current.countryCounts) {
                for (const country of current.countryCounts) {
                    if (!processedCountries.has(country.countryCode)) {
                        processedCountries.add(country.countryCode);
                        migrations.push({
                            haplogroup: current.name,
                            country: country.name,
                            kitsCount: country.kitsCounts
                        });
                    }
                }
            }
            current = current.parentId ? this.haplogroups[current.parentId] : null;
        }

        return migrations;
    }

    analyzeSimilarity(haplogroup1Id, haplogroup2Id) {
        const haplo1 = this.haplogroups[haplogroup1Id];
        const haplo2 = this.haplogroups[haplogroup2Id];
        if (!haplo1 || !haplo2) return null;

        const ancestry1 = this.getAncestryChain(haplogroup1Id);
        const ancestry2 = this.getAncestryChain(haplogroup2Id);

        let commonAncestor = null;
        for (const a1 of ancestry1) {
            for (const a2 of ancestry2) {
                if (a1.id === a2.id) {
                    commonAncestor = a1;
                    break;
                }
            }
            if (commonAncestor) break;
        }

        const countries1 = new Map(haplo1.countryCounts?.map(c => [c.countryCode, c.kitsCounts]) || []);
        const countries2 = new Map(haplo2.countryCounts?.map(c => [c.countryCode, c.kitsCounts]) || []);
        const commonCountries = [];

        for (const [code, count1] of countries1) {
            if (countries2.has(code)) {
                commonCountries.push({
                    code,
                    counts: [count1, countries2.get(code)]
                });
            }
        }

        return {
            commonAncestor: commonAncestor?.name,
            divergenceDepth: ancestry1.length + ancestry2.length - (commonAncestor ? 2 : 0),
            commonCountries,
            sharedVariants: haplo1.variants?.filter(v1 => 
                haplo2.variants?.some(v2 => v1.variant === v2.variant)
            ).map(v => v.variant) || []
        };
    }

    getAncestryChain(haplogroupId) {
        const chain = [];
        let current = this.haplogroups[haplogroupId];
        
        while (current) {
            chain.push({
                id: current.haplogroupId,
                name: current.name,
                variants: current.variants ? current.variants.map(v => v.variant) : []
            });
            if (!current.parentId) break;
            current = this.haplogroups[current.parentId];
        }
        
        return chain.reverse();
    }
}

module.exports = { HaploTree };