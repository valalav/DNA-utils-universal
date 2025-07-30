class MigrationTracker {
    constructor() {
        this.migrations = new Map();
    }

    addMigration(sourceId, targetId, type, confidence) {
        this.migrations.set(sourceId, {
            targetId,
            type,
            confidence,
            timestamp: Date.now()
        });
    }

    getMigration(sourceId) {
        return this.migrations.get(sourceId);
    }

    hasMigration(sourceId) {
        return this.migrations.has(sourceId);
    }
}

module.exports = { MigrationTracker };
