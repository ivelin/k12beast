-- src/supabase/functions/local-sql.sql
-- Placeholder for a local PostgreSQL function
-- Note: The k12beast app currently uses the `execute-sql` edge function to execute SQL commands.
-- If you want to define a local PostgreSQL function, you can add it here and apply it using a migration.

-- Function to execute SQL commands (used by the execute-sql Edge Function)
CREATE OR REPLACE FUNCTION execute_sql(sql_text TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_text;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error executing SQL: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to the function (adjust based on your security requirements)
GRANT EXECUTE ON FUNCTION execute_sql TO postgres;

-- Grant additional permissions to the postgres role
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON TABLE sessions TO postgres;
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres;

-- Function to validate a user ID exists in auth.users
CREATE OR REPLACE FUNCTION public.validate_user_id(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error validating user ID: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the postgres role (used by Edge Functions)
GRANT EXECUTE ON FUNCTION public.validate_user_id(UUID) TO postgres;

-- Ensure the postgres role can access the public schema
GRANT USAGE ON SCHEMA public TO postgres;

-- Note: The foreign key constraint on sessions(user_id) allows NULL values by default,
-- meaning existing sessions can have a NULL user_id until they are updated.