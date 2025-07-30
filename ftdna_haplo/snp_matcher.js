class SNPMatcher {
    constructor(sourceTree, targetTree) {
        this.sourceTree = sourceTree;
        this.targetTree = targetTree;
    }

    matchByVariants(sourceNode) {
        const matches = [];
        if (!sourceNode.variants) return matches;

        for (const variant of sourceNode.variants) {
            const variantMatch = this.targetTree.findHaplogroup(variant.variant);
            if (variantMatch) {
                matches.push({
                    type: 'variant',
                    source: variant.variant,
                    target: variantMatch
                });
            }

            if (variant.alternativeNames) {
                for (const altName of variant.alternativeNames) {
                    const altMatch = this.targetTree.findHaplogroup(altName);
                    if (altMatch) {
                        matches.push({
                            type: 'alternative',
                            source: altName,
                            target: altMatch
                        });
                    }
                }
            }
        }

        return matches;
    }
}

module.exports = { SNPMatcher };
