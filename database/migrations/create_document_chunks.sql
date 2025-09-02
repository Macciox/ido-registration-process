-- Create document_chunks table for storing PDF text chunks
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique chunk index per document
  UNIQUE(document_id, chunk_index)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id 
ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_index 
ON document_chunks(document_id, chunk_index);

-- Add RLS policy if needed
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Allow service role full access" ON document_chunks
FOR ALL TO service_role USING (true) WITH CHECK (true);