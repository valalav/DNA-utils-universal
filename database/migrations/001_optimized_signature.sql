-- Migration: Add IntArray Signature for Optimized Filtering
-- Part of: PostgreSQL Signature Filter (Performance)

-- 1. Enable intarray extension for fast integer array operations (&&, @>, etc.)
CREATE EXTENSION IF NOT EXISTS intarray;

-- 2. Create function to generate signature from markers JSONB
-- Logic: Hash "Key:Value" string to 32-bit integer
-- We use a predefined list of 37 standard markers to ensure stable array size/order if needed,
-- but for "Overlap" check, a simple set of hashes is sufficient.
CREATE OR REPLACE FUNCTION generate_marker_signature(markers JSONB)
RETURNS INTEGER[] AS $$
DECLARE
    key text;
    val text;
    sig integer[];
    hash_val integer;
BEGIN
    sig := ARRAY[]::integer[];
    
    -- Iterate through all keys in the JSONB object
    FOR key, val IN SELECT * FROM jsonb_each_text(markers)
    LOOP
        -- Only process non-empty values
        IF val IS NOT NULL AND val != '' THEN
            -- Generate hash for "Key:Value" pair (e.g., "DYS393:13")
            -- hashtext returns a 32-bit integer
            hash_val := hashtext(key || ':' || val);
            sig := sig || hash_val;
        END IF;
    END LOOP;
    
    -- Sort and remove duplicates (intarray works best with sorted unique arrays)
    -- The 'sort' and 'uniq' functions come from intarray extension
    RETURN sort(uniq(sig));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Add the generated column
-- Note: Postgres 12+ supports generated columns. 
-- If PL/pgSQL function is not strictly immutable (it is here), it works.
ALTER TABLE ystr_profiles 
ADD COLUMN marker_signature INTEGER[] GENERATED ALWAYS AS (
    generate_marker_signature(markers)
) STORED;

-- 4. Create GiST Index for fast Overlap (&&) operations
-- gist__intbig_ops is optimized for large arrays/signatures
CREATE INDEX idx_ystr_profiles_signature 
ON ystr_profiles 
USING GIST (marker_signature gist__intbig_ops);

-- 5. Test Query (Commented out)
-- SELECT count(*) FROM ystr_profiles WHERE marker_signature && generate_marker_signature('{"DYS393":"13"}'::jsonb);
