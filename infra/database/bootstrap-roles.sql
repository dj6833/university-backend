/*
Script intended to be run manually against any target Neon postgres DB during setup
Ensure you adjust "set_password_here" accordingly for the university_backend_core_services_app
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'university_backend_core_services_app') THEN
CREATE ROLE university_backend_core_services_app WITH LOGIN PASSWORD 'set_password_here';
END IF;
END
$$;

GRANT CONNECT ON DATABASE neondb TO university_backend_core_services_app;
GRANT USAGE ON SCHEMA public TO university_backend_core_services_app;
