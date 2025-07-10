-- Remove owner_email column from projects table since we're using project_owners table
ALTER TABLE projects DROP COLUMN owner_email;

-- Update project_fields policies to use project_owners table
DROP POLICY IF EXISTS "Project owners can view their own project fields" ON project_fields;
CREATE POLICY "Project owners can view their own project fields"
  ON project_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = project_fields.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Project owners can update their own project fields" ON project_fields;
CREATE POLICY "Project owners can update their own project fields"
  ON project_fields FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = project_fields.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Project owners can insert their own project fields" ON project_fields;
CREATE POLICY "Project owners can insert their own project fields"
  ON project_fields FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = project_fields.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Update FAQs policies
DROP POLICY IF EXISTS "Project owners can view their project FAQs" ON faqs;
CREATE POLICY "Project owners can view their project FAQs"
  ON faqs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = faqs.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Project owners can update their project FAQs" ON faqs;
CREATE POLICY "Project owners can update their project FAQs"
  ON faqs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = faqs.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Project owners can insert their project FAQs" ON faqs;
CREATE POLICY "Project owners can insert their project FAQs"
  ON faqs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = faqs.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Project owners can delete their project FAQs" ON faqs;
CREATE POLICY "Project owners can delete their project FAQs"
  ON faqs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = faqs.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Update quiz_questions policies
DROP POLICY IF EXISTS "Project owners can view their project quiz questions" ON quiz_questions;
CREATE POLICY "Project owners can view their project quiz questions"
  ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = quiz_questions.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Project owners can update their project quiz questions" ON quiz_questions;
CREATE POLICY "Project owners can update their project quiz questions"
  ON quiz_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = quiz_questions.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Project owners can insert their project quiz questions" ON quiz_questions;
CREATE POLICY "Project owners can insert their project quiz questions"
  ON quiz_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = quiz_questions.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Project owners can delete their project quiz questions" ON quiz_questions;
CREATE POLICY "Project owners can delete their project quiz questions"
  ON quiz_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = quiz_questions.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Update media_kit policies
DROP POLICY IF EXISTS "Project owners can view their project media kit" ON media_kit;
CREATE POLICY "Project owners can view their project media kit"
  ON media_kit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = media_kit.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Add policy to allow project owners to update their project's media kit
CREATE POLICY "Project owners can update their project media kit"
  ON media_kit FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_owners
      WHERE project_owners.project_id = media_kit.project_id
      AND project_owners.email = (
        SELECT email FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Function to automatically add the creator as a project owner when a project is created
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_owners (project_id, email)
  VALUES (NEW.id, (
    SELECT email FROM profiles
    WHERE id = auth.uid()
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add project owner when a project is created
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_project();