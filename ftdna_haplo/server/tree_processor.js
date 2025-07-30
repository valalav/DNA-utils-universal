class TreeProcessor {
    constructor(tree) {
        this.tree = tree;
    }

    extractHaplogroup(path) {
        if (!path) return null;
        return path.split(' > ')[0].split('-')[0];
    }

    extractSNP(name) {
        const parts = name.split('-');
        return parts.length > 1 ? parts[1] : null;
    }

    async getPathToRoot(nodeId) {
        const path = [];
        let current = nodeId;

        try {
            while (current) {
                const node = this.tree.findHaplogroup(current);
                if (!node) break;

                const details = this.tree.getHaplogroupDetails(node.haplogroupId);
                if (!details) break;

                path.unshift({
                    node,
                    details,
                    snp: this.extractSNP(node.name),
                    haplogroup: this.extractHaplogroup(details.path.string)
                });

                current = node.parentId;
            }
        } catch (err) {
            console.error('Error getting path to root:', err);
        }

        return path;
    }

    getAllVariants(node) {
        const variants = new Set();
        
        if (node.details.variants) {
            for (const variant of node.details.variants) {
                variants.add(variant.variant);
                if (variant.alternativeNames) {
                    variant.alternativeNames.forEach(alt => variants.add(alt));
                }
            }
        }

        return Array.from(variants);
    }
}

module.exports = { TreeProcessor };
