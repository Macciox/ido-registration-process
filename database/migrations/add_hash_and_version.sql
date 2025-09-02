-- Add doc_hash column to compliance_documents if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'compliance_documents' 
                   AND column_name = 'doc_hash') THEN
        ALTER TABLE compliance_documents ADD COLUMN doc_hash TEXT;
    END IF;
END $$;

-- Add version column to compliance_checks if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'compliance_checks' 
                   AND column_name = 'version') THEN
        ALTER TABLE compliance_checks ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add document_url column for file storage if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'compliance_documents' 
                   AND column_name = 'document_url') THEN
        ALTER TABLE compliance_documents ADD COLUMN document_url TEXT;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_compliance_checks_doc_version 
ON compliance_checks(document_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_hash 
ON compliance_documents(doc_hash);