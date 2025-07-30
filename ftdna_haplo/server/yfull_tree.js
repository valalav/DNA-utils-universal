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