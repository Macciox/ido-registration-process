-- Add indexes to faqs table
CREATE INDEX IF NOT EXISTS faqs_project_id_idx ON faqs(project_id);
CREATE INDEX IF NOT EXISTS faqs_created_at_idx ON faqs(created_at);

-- Add indexes to quiz_questions table
CREATE INDEX IF NOT EXISTS quiz_questions_project_id_idx ON quiz_questions(project_id);
CREATE INDEX IF NOT EXISTS quiz_questions_created_at_idx ON quiz_questions(created_at);

-- Add indexes to profiles table
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles(created_at);

-- Add indexes to admin_invitations table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admin_invitations'
  ) THEN
    CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON admin_invitations(email);
    CREATE INDEX IF NOT EXISTS admin_invitations_created_at_idx ON admin_invitations(created_at);
  END IF;
END $$;