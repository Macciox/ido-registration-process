-- Create project-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for project-documents bucket
CREATE POLICY "Admins can upload project documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-documents' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view project documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-documents' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete project documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-documents' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );