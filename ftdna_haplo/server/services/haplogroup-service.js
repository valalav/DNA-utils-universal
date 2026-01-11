class HaplogroupService {
    constructor(ftdnaTree, yfullTree, searchIntegrator) {
        this.ftdnaTree = ftdnaTree;
        this.yfullTree = yfullTree;
        this.searchIntegrator = searchIntegrator;
    }

    async searchHaplogroup(term) {
        console.log('\nSearching for:', term);

        const result = {
            ftdna: null,
            yfull: null
        };

        if (this.ftdnaTree) {
            const ftdnaNode = this.ftdnaTree.findHaplogroup(term);
            if (ftdnaNode) {
                const details = this.ftdnaTree.getHaplogroupDetails(ftdnaNode.haplogroupId);
                if (details?.path) {
                    result.ftdna = {
                        path: details.path,
                        url: `https://discover.familytreedna.com/y-dna/${term}/tree`,
                        statistics: details.statistics,
                        treeData: this.ftdnaTree.getSubtree(ftdnaNode.haplogroupId)
                    };
                }
            }
        }

        if (this.yfullTree) {
            const yfullNode = this.yfullTree.findHaplogroup(term);
            if (yfullNode) {
                const details = this.yfullTree.getHaplogroupDetails(yfullNode.id);
                if (details?.path) {
                    // Use the node's canonical ID for the URL, not the search term
                    // This handles synonyms: searching for "CTS1192" will use URL with "J-Z387"
                    result.yfull = {
                        path: details.path,
                        url: `https://www.yfull.com/tree/${yfullNode.id}/`,
                        statistics: details.statistics,
                        searchedTerm: term,
                        canonicalId: yfullNode.id
                    };
                }
            }
        }

        if (result.ftdna && !result.yfull && this.searchIntegrator) {
            const yfullMatch = await this.searchIntegrator.findCorrespondingBranch(
                term, result.ftdna.path.string, 'ftdna'
            );
            if (yfullMatch?.result) {
                const details = this.yfullTree.getHaplogroupDetails(yfullMatch.result.id);
                if (details?.path) {
                    // Use node ID (canonical YFull identifier) for URL
                    result.yfull = {
                        path: details.path,
                        url: `https://www.yfull.com/tree/${yfullMatch.result.id}/`,
                        statistics: details.statistics,
                        matchedViaCrossTree: true,
                        matchedSNP: yfullMatch.matchedSNP
                    };
                }
            }
        } else if (!result.ftdna && result.yfull && this.searchIntegrator) {
            const ftdnaMatch = await this.searchIntegrator.findCorrespondingBranch(
                term, result.yfull.path.string, 'yfull'
            );
            if (ftdnaMatch?.result) {
                const details = this.ftdnaTree.getHaplogroupDetails(ftdnaMatch.result.haplogroupId);
                if (details?.path) {
                    result.ftdna = {
                        path: details.path,
                        url: `https://discover.familytreedna.com/y-dna/${ftdnaMatch.result.name}/tree`,
                        statistics: details.statistics,
                        treeData: this.ftdnaTree.getSubtree(ftdnaMatch.result.haplogroupId)
                    };
                }
            }
        }

        return result;
    }

    async checkSubclade(haplogroup, parentHaplogroup) {
        if (!haplogroup || !parentHaplogroup) {
            console.log('Missing required parameters:', { haplogroup, parentHaplogroup });
            return false;
        }

        console.log(`🔍 Checking if "${haplogroup}" is subclade of "${parentHaplogroup}"`);

        let isSubcladeResult = false;

        try {
            if (this.ftdnaTree && typeof this.ftdnaTree.isSubclade === 'function') {
                console.log('📊 Checking with FTDNA tree...');
                isSubcladeResult = this.ftdnaTree.isSubclade(haplogroup, parentHaplogroup);
                console.log('FTDNA check result:', isSubcladeResult);
            } else {
                console.log('⚠️ FTDNA tree not available or missing isSubclade method');
            }

            if (!isSubcladeResult && this.yfullTree) {
                console.log('📊 Checking with YFull tree...');
                isSubcladeResult = this.yfullTree.isSubclade(haplogroup, parentHaplogroup);
                console.log('YFull check result:', isSubcladeResult);
            }
        } catch (error) {
            console.error('❌ Error in checkSubclade:', error);
            console.error('Error stack:', error.stack);
            // Возвращаем false вместо выброса исключения
            return false;
        }

        console.log(`✅ Final result for "${haplogroup}" vs "${parentHaplogroup}": ${isSubcladeResult}`);
        return isSubcladeResult;
    }

    getSynonyms(haplogroupName) {
        if (!this.yfullTree) {
            return [haplogroupName];
        }

        // Extract SNP from haplogroup name
        const snp = haplogroupName.includes('-')
            ? haplogroupName.split('-').slice(1).join('-')
            : haplogroupName;

        const synonyms = this.yfullTree.getSynonymsForSnp(snp);
        if (synonyms.length === 0) {
            return [haplogroupName];
        }

        // Return synonyms with the base haplogroup prefix if present
        const prefix = haplogroupName.includes('-')
            ? haplogroupName.split('-')[0] + '-'
            : '';

        return synonyms.map(syn => prefix + syn);
    }

    // Check if two haplogroup names are synonyms (same branch in the tree)
    areSynonyms(haplo1, haplo2) {
        if (!this.yfullTree) {
            return haplo1.toUpperCase() === haplo2.toUpperCase();
        }
        return this.yfullTree.areSameNode(haplo1, haplo2);
    }

    async getAllSubclades(parentHaplogroup) {
        console.log(`🌿 Getting all subclades for "${parentHaplogroup}"`);
        const allSubclades = new Set();

        if (this.ftdnaTree && typeof this.ftdnaTree.getAllSubclades === 'function') {
            const ftdnaSubclades = this.ftdnaTree.getAllSubclades(parentHaplogroup);
            ftdnaSubclades.forEach(subclade => allSubclades.add(subclade));
            console.log(`📊 Found ${ftdnaSubclades.length} subclades in FTDNA tree.`);
        }

        if (this.yfullTree && typeof this.yfullTree.getAllSubclades === 'function') {
            const yfullSubclades = this.yfullTree.getAllSubclades(parentHaplogroup);
            yfullSubclades.forEach(subclade => allSubclades.add(subclade));
            console.log(`🌳 Found ${yfullSubclades.length} subclades in YFull tree.`);
        }

        const result = Array.from(allSubclades);
        console.log(`✅ Total unique subclades found: ${result.length}`);
        return result;
    }
}

module.exports = HaplogroupService;