class SNPHistoryHandler {
    constructor() {
        this.history = new Map();
    }

    generateKey(haplogroup, snp) {
        return `${haplogroup}-${snp}`;
    }

    addMatch(source, target, matchType, confidence) {
        const sourceKey = this.generateKey(source.haplogroup, source.snp);
        const targetKey = this.generateKey(target.haplogroup, target.snp);

        this.history.set(sourceKey, {
            source: sourceKey,
            target: targetKey,
            matchType,
            confidence,
            timestamp: Date.now()
        });

        console.log('Added match to history:', {
            source: sourceKey,
            target: targetKey,
            matchType,
            confidence
        });
    }

    findMatch({ haplogroup, snp }) {
        const key = this.generateKey(haplogroup, snp);
        const match = this.history.get(key);

        if (match) {
            console.log('Found match in history:', match);
            return match;
        }

        return null;
    }

    clearHistory() {
        this.history.clear();
        console.log('History cleared');
    }

    // Опционально: очистка старых записей
    clearOldEntries(maxAge = 24 * 60 * 60 * 1000) { // По умолчанию 24 часа
        const now = Date.now();
        for (const [key, entry] of this.history.entries()) {
            if (now - entry.timestamp > maxAge) {
                this.history.delete(key);
            }
        }
    }
}

module.exports = { SNPHistoryHandler }; 