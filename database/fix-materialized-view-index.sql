-- Drop existing non-unique index if it exists
DROP INDEX IF EXISTS idx_marker_stats_name;

-- Create UNIQUE index required for REFRESH CONCURRENTLY
-- marker_name is unique because the view is grouped by key
CREATE UNIQUE INDEX idx_marker_stats_name ON marker_statistics(marker_name);
