-- Drop potential conflicting versions
DROP FUNCTION IF EXISTS bulk_insert_profiles(jsonb, boolean);
DROP FUNCTION IF EXISTS bulk_insert_profiles(jsonb);

-- Restore correct 1-argument version from schema.sql
CREATE OR REPLACE FUNCTION bulk_insert_profiles(profiles_data JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    inserted_count INTEGER := 0;
    profile JSONB;
BEGIN
    FOR profile IN SELECT jsonb_array_elements(profiles_data)
    LOOP
        INSERT INTO ystr_profiles (kit_number, name, country, haplogroup, markers)
        VALUES (
            profile->>'kit_number',
            profile->>'name',
            profile->>'country',
            profile->>'haplogroup',
            profile->'markers'
        )
        ON CONFLICT (kit_number)
        DO UPDATE SET
            name = EXCLUDED.name,
            country = EXCLUDED.country,
            haplogroup = EXCLUDED.haplogroup,
            markers = EXCLUDED.markers,
            updated_at = CURRENT_TIMESTAMP;

        inserted_count := inserted_count + 1;
    END LOOP;

    RETURN inserted_count;
END;
$$;
