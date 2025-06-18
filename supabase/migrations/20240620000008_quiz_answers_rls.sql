-- Enable RLS on quiz_answers table (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'quiz_answers'
  ) THEN
    -- Enable RLS
    ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admins can do everything" ON quiz_answers;
    DROP POLICY IF EXISTS "Project owners can view their quiz answers" ON quiz_answers;
    DROP POLICY IF EXISTS "Users can submit their own answers" ON quiz_answers;

    -- Create new policies using functions
    EXECUTE 'CREATE POLICY "Admins can do everything" 
    ON quiz_answers 
    FOR ALL 
    TO authenticated 
    USING (is_admin())';

    EXECUTE 'CREATE POLICY "Project owners can view their quiz answers" 
    ON quiz_answers 
    FOR SELECT 
    TO authenticated 
    USING (is_project_owner(project_id))';

    EXECUTE 'CREATE POLICY "Users can submit their own answers" 
    ON quiz_answers 
    FOR INSERT 
    TO authenticated 
    USING (user_id = auth.uid())';
  END IF;
END $$;