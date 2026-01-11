class YFullTree {
    constructor(jsonData) {
        this.data = jsonData;
        this.idToNode = new Map();
        this.snpToNode = new Map();
        this.initializeIndices(this.data);
    }

    formatSnps(snps) {
        if (!snps) return [];
        const snpsList = Array.isArray(snps) ? snps : snps.split(/,\s*/);
        return snpsList.map(snp => {
            const variants = snp.split('/');
            return {
                primary: variants[0].trim(),
                alternatives: variants.slice(1).map(v => v.trim()),
                raw: snp.trim()
            };
        });
    }

    initializeIndices(node, parentId = null) {
        if (!node) return;

        if (node.id) {
            const formattedNode = {
                ...node,
                parentId,
                formattedSnps: this.formatSnps(node.snps)
            };
            this.idToNode.set(node.id, formattedNode);

            if (node.snps) {
                const snpsList = Array.isArray(node.snps) ? node.snps : node.snps.split(/,\s*/);
                snpsList.forEach(snp => {
                    snp.split('/').forEach(singleSnp => {
                        singleSnp = singleSnp.trim();
                        if (singleSnp) {
                            this.snpToNode.set(singleSnp.toUpperCase(), node.id);
                        }
                    });
                });
            }
        }

        if (node.children) {
            node.children.forEach(child => this.initializeIndices(child, node.id));
        }
    }

    findNodeById(id) {
        return this.idToNode.get(id);
    }

    findNodeBySnp(snp) {
        const nodeId = this.snpToNode.get(snp.toUpperCase());
        return nodeId ? this.idToNode.get(nodeId) : null;
    }

    getNodePath(nodeId) {
        const path = [];
        let current = this.idToNode.get(nodeId);

        while (current) {
            path.push({
                id: current.id,
                formed: current.formed,
                tmrca: current.tmrca,
                snps: current.formattedSnps,
                mainSnp: current.formattedSnps?.length > 0 ?
                    current.formattedSnps[0].primary : null
            });

            if (!current.parentId) break;
            current = this.idToNode.get(current.parentId);
        }

        return path.reverse();
    }

    getNodeDetails(nodeId) {
        const node = this.idToNode.get(nodeId);
        if (!node) return null;

        const pathNodes = this.getNodePath(nodeId);
        const pathString = pathNodes.map(node => {
            const snpStr = node.mainSnp ? `-${node.mainSnp}` : '';
            return `${node.id}${snpStr}`;
        }).join(' > ');

        return {
            id: node.id,
            formed: node.formed,
            tmrca: node.tmrca,
            snps: node.formattedSnps,
            path: {
                nodes: pathNodes,
                string: pathString
            },
            children: node.children?.map(child => ({
                id: child.id,
                formed: child.formed,
                tmrca: child.tmrca,
                snps: this.formatSnps(child.snps)
            })) || []
        };
    }

    getHaplogroupDetails(nodeId) {
        return this.getNodeDetails(nodeId);
    }

    searchNodes(query, limit = 10) {
        query = query.toUpperCase();
        const results = new Map();

        // Поиск по SNP
        const snpNode = this.findNodeBySnp(query);
        if (snpNode) {
            results.set(snpNode.id, {
                type: 'SNP',
                match: query,
                node: snpNode
            });
        }

        // Поиск по ID
        for (const [id, node] of this.idToNode.entries()) {
            if (results.size >= limit) break;

            if (id.toUpperCase().includes(query) && !results.has(id)) {
                results.set(id, {
                    type: 'ID',
                    match: id,
                    node: node
                });
            }
        }

        return Array.from(results.values());
    }

    searchWithAutocomplete(query, limit = 10) {
        return this.searchNodes(query, limit);
    }

    // Find a haplogroup node by ID or SNP, handling synonyms and prefixes
    findHaplogroup(term) {
        if (!term) return null;

        // 1. Try exact ID match
        let node = this.findNodeById(term);
        if (node) return node;

        // 2. Try exact SNP match
        node = this.findNodeBySnp(term);
        if (node) return node;

        // 3. Try stripping prefix (e.g. "J-CTS1192" -> "CTS1192")
        if (term.includes('-')) {
            const termClean = term.split('-').slice(1).join('-');
            if (termClean && termClean !== term) {
                node = this.findNodeBySnp(termClean);
                if (node) return node;
            }
        }

        return null;
    }

    // Get all synonyms for a given SNP (returns array of all SNP names that point to the same node)
    getSynonymsForSnp(snp) {
        const nodeId = this.snpToNode.get(snp.toUpperCase());
        if (!nodeId) return [];

        const node = this.idToNode.get(nodeId);
        if (!node || !node.formattedSnps) return [snp];

        const synonyms = new Set();
        for (const snpObj of node.formattedSnps) {
            if (snpObj.primary) synonyms.add(snpObj.primary.toUpperCase());
            if (snpObj.alternatives) {
                snpObj.alternatives.forEach(alt => synonyms.add(alt.toUpperCase()));
            }
        }
        return Array.from(synonyms);
    }

    // Extract SNP from haplogroup name (e.g., "J-Z387" -> "Z387")
    extractSnp(haplogroupName) {
        if (!haplogroupName) return null;
        const parts = haplogroupName.split('-');
        return parts.length > 1 ? parts.slice(1).join('-') : haplogroupName;
    }

    // Check if two haplogroup names refer to the same node (are synonyms)
    areSameNode(haplo1, haplo2) {
        const snp1 = this.extractSnp(haplo1);
        const snp2 = this.extractSnp(haplo2);

        if (!snp1 || !snp2) return false;

        const nodeId1 = this.snpToNode.get(snp1.toUpperCase());
        const nodeId2 = this.snpToNode.get(snp2.toUpperCase());

        // If both resolve to the same node, they're synonyms
        return nodeId1 && nodeId2 && nodeId1 === nodeId2;
    }

    // Check if haplogroupName is a subclade of parentHaplogroupName
    isSubclade(haplogroupName, parentHaplogroupName) {
        if (!haplogroupName || !parentHaplogroupName) return false;

        // Extract SNPs from haplogroup names
        const haploSnp = this.extractSnp(haplogroupName);
        const parentSnp = this.extractSnp(parentHaplogroupName);

        if (!haploSnp || !parentSnp) return false;

        // Find nodes by SNP
        const haploNode = this.findNodeBySnp(haploSnp);
        const parentNode = this.findNodeBySnp(parentSnp);

        if (!haploNode || !parentNode) return false;

        // If they're the same node (synonyms), return true
        if (haploNode.id === parentNode.id) return true;

        // Walk up the tree from haploNode to see if we reach parentNode
        let current = haploNode;
        while (current) {
            if (current.id === parentNode.id) {
                return true;
            }
            if (!current.parentId) break;
            current = this.idToNode.get(current.parentId);
        }

        return false;
    }

    getAllSubclades(parentHaplogroup) {
        const parentNode = this.findHaplogroup(parentHaplogroup);
        if (!parentNode) return [];

        const subclades = new Set();

        const traverse = (node) => {
            if (!node) return;
            // Add current node ID
            subclades.add(node.id);

            // Add children
            if (node.children) {
                node.children.forEach(child => {
                    const fullChild = this.idToNode.get(child.id);
                    traverse(fullChild);
                });
            }
        };

        // Start traversal from children (excluding parent itself if desired, 
        // but typically getAllSubclades might implies descendants. 
        // Based on usage 'isSubclade', let's include descendants.)
        if (parentNode.children) {
            parentNode.children.forEach(child => {
                const fullChild = this.idToNode.get(child.id);
                traverse(fullChild);
            });
        }

        return Array.from(subclades);
    }

    getNodeStatistics(nodeId = null) {
        const processNode = (node) => {
            if (!node) return {
                nodeCount: 0,
                snpCount: 0,
                maxTmrca: 0,
                minTmrca: Infinity
            };

            let stats = {
                nodeCount: 1,
                snpCount: node.formattedSnps?.length || 0,
                maxTmrca: node.tmrca || 0,
                minTmrca: node.tmrca || Infinity
            };

            if (node.children) {
                node.children.forEach(child => {
                    const childStats = processNode(this.idToNode.get(child.id));
                    stats.nodeCount += childStats.nodeCount;
                    stats.snpCount += childStats.snpCount;
                    stats.maxTmrca = Math.max(stats.maxTmrca, childStats.maxTmrca);
                    stats.minTmrca = Math.min(stats.minTmrca, childStats.minTmrca);
                });
            }

            return stats;
        };

        const targetNode = nodeId ? this.idToNode.get(nodeId) : this.data;
        const stats = processNode(targetNode);

        return {
            totalNodes: stats.nodeCount,
            totalSnps: stats.snpCount,
            ageRange: {
                min: stats.minTmrca === Infinity ? 0 : stats.minTmrca,
                max: stats.maxTmrca
            }
        };
    }
}

module.exports = { YFullTree };