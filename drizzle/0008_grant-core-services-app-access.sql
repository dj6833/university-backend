DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'university_backend_core_services_app') THEN
    GRANT SELECT ON TABLE "user", enrollments, classes, subjects, departments, enrollment_class_counts_view TO university_backend_core_services_app;
GRANT SELECT, UPDATE ON TABLE documents TO university_backend_core_services_app;
END IF;
END
$$;
