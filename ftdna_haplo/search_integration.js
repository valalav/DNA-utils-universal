const { TreeProcessor } = require('./tree_processor');
const { SNPMatcher } = require('./snp_matcher');
const { MatchValidator } = require('./match_validator');
const { MigrationTracker } = require('./migration_tracker');

class SearchIntegrator {
    constructor(ftdnaTree, yfullTree) {
        this.ftdnaTree = ftdnaTree;
        this.yfullTree = yfullTree;
    }

    async findCorrespondingBranch(searchTerm, sourcePath, sourceTree) {
        const targetTree = sourceTree === 'yfull' ? this.ftdnaTree : this.yfullTree;
        const sourceTreeObj = sourceTree === 'yfull' ? this.yfullTree : this.ftdnaTree;

        // 1. Находим исходный узел
        const sourceNode = sourceTreeObj.findHaplogroup(searchTerm);
        if (!sourceNode) return null;

        const sourceDetails = sourceTreeObj.getHaplogroupDetails(sourceNode.haplogroupId);
        if (!sourceDetails?.path?.nodes) return null;

        // 2. Берем префикс либо из запроса, либо из первого реального узла пути (пропускаем A0-T и т.п.)
        const [requestPrefix, snp] = searchTerm.includes('-') ? 
            searchTerm.split('-') : [null, searchTerm];

        // Ищем первый узел с реальной гаплогруппой (I, R, J и т.п.)
        const haploPrefix = requestPrefix || sourceDetails.path.nodes.find(node => 
            node.name.split('-')[0].match(/^[A-Z][A-Z0-9]*$/)
        )?.name.split('-')[0];

        console.log(`Using prefix: ${haploPrefix}`);

        // 3. Идем по пути снизу вверх
        const pathNodes = [...sourceDetails.path.nodes].reverse();

        for (const node of pathNodes) {
            const nodeSNP = node.name.split('-')[1];
            if (!nodeSNP) continue;

            console.log(`Checking node: ${node.name}`);

            // Сначала пробуем без префикса
            const result = targetTree.findHaplogroup(nodeSNP);
            if (result) {
                const details = targetTree.getHaplogroupDetails(result.haplogroupId);
                // Check if any node in path belongs to the target haplogroup (e.g., J, R, I)
                // Path string starts with root (A-...), so we check nodes instead
                const pathContainsHaplo = details?.path?.nodes?.some(
                    n => n.name?.split('-')[0] === haploPrefix
                );
                if (pathContainsHaplo) {
                    console.log(`Found match: ${result.name}`);
                    return {
                        result,
                        confidence: 0.9,
                        matchType: 'ancestor',
                        matchedSNP: nodeSNP
                    };
                }
            }

            // Потом с префиксом
            const withPrefix = `${haploPrefix}-${nodeSNP}`;
            const resultWithPrefix = targetTree.findHaplogroup(withPrefix);
            if (resultWithPrefix) {
                console.log(`Found match: ${resultWithPrefix.name}`);
                return {
                    result: resultWithPrefix,
                    confidence: 0.9,
                    matchType: 'ancestor',
                    matchedSNP: nodeSNP
                };
            }
        }

        return null;
    }
}

module.exports = { SearchIntegrator };