-- Add compliance_documents table with RLS

CREATE TABLE compliance_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy - users can only access their own documents
CREATE POLICY "Users can manage their own documents" ON compliance_documents
  FOR ALL USING (auth.uid() = user_id);

-- Update compliance_checks to reference documents
ALTER TABLE compliance_checks 
ADD COLUMN document_id UUID REFERENCES compliance_documents(id) ON DELETE CASCADE;

-- Index for performance
CREATE INDEX idx_compliance_documents_user_id ON compliance_documents(user_id);
CREATE INDEX idx_compliance_checks_document_id ON compliance_checks(document_id);