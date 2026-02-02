-- Grant privileges to the app user (run as postgres after schema.sql).
-- Replace numerology_app with your DATABASE_URL username if different.

GRANT USAGE ON SCHEMA public TO numerology_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO numerology_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO numerology_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO numerology_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO numerology_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO numerology_app;
