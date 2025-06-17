-- Create a function to execute arbitrary SQL
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;