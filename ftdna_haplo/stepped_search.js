const { SNPHistoryHandler } = require('./snp_history');

const createSteppedSearch = (ftdnaTree, yfullTree) => {
    const historyHandler = new SNPHistoryHandler();

    function extractHaplogroup(path) {
        if (!path) return null;
        return path.split(' > ')[0].split('-')[0];
    }

    function parsePath(path) {
        if (!path) return [];
        return path.split(' > ').map(segment => {
            const [haplo, snp] = segment.split('-');
            return { haplogroup: haplo, snp };
        });
    }

    async function findBranchInTree(snp, haplogroup, tree) {
        // Проверяем историю
        const historicMatch = historyHandler.findMatch({ haplogroup, snp });
        if (historicMatch) {
            const [targetHaplo, targetSNP] = historicMatch.target.split('-');
            const result = tree.findHaplogroup(`${targetHaplo}-${targetSNP}`);
            if (result) {
                return { 
                    result, 
                    details: tree.getHaplogroupDetails(result.haplogroupId),
                    fromHistory: true 
                };
            }
        }

        const withHaplo = haplogroup ? `${haplogroup}-${snp}` : snp;
        const result = tree.findHaplogroup(withHaplo);
        if (!result) return null;

        const details = tree.getHaplogroupDetails(result.haplogroupId);
        const resultHaplo = extractHaplogroup(details.path.string);
        
        if (haplogroup && resultHaplo !== haplogroup) return null;

        return { result, details };
    }

    async function findCrossTreeMatches(snp, haplogroup, pathSegments) {
        const matches = [];

        // Собираем все SNP из текущего сегмента пути
        const currentSegment = pathSegments.find(s => s.snp === snp);
        if (currentSegment) {
            const segmentIndex = pathSegments.indexOf(currentSegment);
            const relevantSegments = pathSegments.slice(0, segmentIndex + 1);

            for (const segment of relevantSegments.reverse()) {
                const result = await findBranchInTree(segment.snp, haplogroup, ftdnaTree);
                if (result) {
                    matches.push({
                        source: segment,
                        target: result,
                        confidence: segment.snp === snp ? 1 : 0.8
                    });
                }
            }
        }

        return matches;
    }

    async function findCorrespondingBranch(searchTerm, sourcePath, sourceTree) {
        console.log(`\nStarting search for: ${searchTerm}`);

        const haploMatch = searchTerm.match(/^([A-Z]+)-(.+)$/);
        const [, haplogroup, snp] = haploMatch || [null, null, searchTerm];
        const targetHaplo = haplogroup || extractHaplogroup(sourcePath);

        console.log(`Target haplogroup: ${targetHaplo}, SNP: ${snp}`);

        // Прямой поиск
        const directMatch = await findBranchInTree(snp, targetHaplo, sourceTree === 'yfull' ? ftdnaTree : yfullTree);
        if (directMatch) {
            if (!directMatch.fromHistory) {
                historyHandler.addMatch(
                    { haplogroup: targetHaplo, snp },
                    { haplogroup: targetHaplo, snp },
                    'direct',
                    1
                );
            }
            return {
                result: directMatch.result,
                matchType: 'direct',
                confidence: 1
            };
        }

        // Поиск через дерево SNP
        const pathSegments = parsePath(sourcePath);
        if (!pathSegments.length) return null;

        const crossMatches = await findCrossTreeMatches(snp, targetHaplo, pathSegments);
        if (crossMatches.length > 0) {
            const bestMatch = crossMatches[0];
            
            historyHandler.addMatch(
                { haplogroup: targetHaplo, snp: bestMatch.source.snp },
                { haplogroup: targetHaplo, snp: bestMatch.target.details.path.string.split('-')[1] },
                bestMatch.source.snp === snp ? 'direct' : 'ancestor',
                bestMatch.confidence
            );

            return {
                result: bestMatch.target.result,
                matchType: bestMatch.source.snp === snp ? 'direct' : 'ancestor',
                matchedSNP: bestMatch.source.snp,
                confidence: bestMatch.confidence
            };
        }

        console.log('No matching branch found');
        return null;
    }

    return { findCorrespondingBranch };
};

module.exports = { createSteppedSearch };