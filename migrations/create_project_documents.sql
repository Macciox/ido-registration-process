-- Create project_documents table for KYB documents
CREATE TABLE project_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'legal', 'whitepaper', 'kyb', 'other'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500),
  link_url VARCHAR(500),
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- Only admins can manage documents
CREATE POLICY "Admins can manage project documents" ON project_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX idx_project_documents_type ON project_documents(document_type);