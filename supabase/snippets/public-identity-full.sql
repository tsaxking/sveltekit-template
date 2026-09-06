DO $$
DECLARE
    schema_name text;
    table_name text;
BEGIN
    FOREACH schema_name IN ARRAY ARRAY[
        'core',
        'public',
        'test'
    ]
    LOOP
        FOR table_name IN
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = schema_name
        LOOP
            EXECUTE format(
                'ALTER TABLE %I.%I REPLICA IDENTITY FULL',
                schema_name,
                table_name
            );
        END LOOP;
    END LOOP;
END $$;
