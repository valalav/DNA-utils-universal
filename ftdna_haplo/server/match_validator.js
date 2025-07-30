class MatchValidator {
    static extractHaplogroup(path) {
        if (!path) return null;
        return path.split(' > ')[0].split('-')[0];
    }

    static validateMatch(sourcePath, targetPath) {
        const sourceHaplo = this.extractHaplogroup(sourcePath);
        const targetHaplo = this.extractHaplogroup(targetPath);

        if (!sourceHaplo || !targetHaplo || sourceHaplo !== targetHaplo) {
            return {
                isValid: false,
                reason: 'haplogroup_mismatch'
            };
        }

        return {
            isValid: true,
            confidence: 1
        };
    }
}

module.exports = { MatchValidator };
