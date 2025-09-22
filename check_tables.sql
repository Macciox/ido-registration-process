-- Check compliance_documents table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'compliance_documents'
ORDER BY ordinal_position;

-- Check project_documents table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'project_documents'
ORDER BY ordinal_position;

-- Check if compliance_documents has project_id
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'compliance_documents' 
    AND column_name = 'project_id'
) as has_project_id;

-- Sample data from compliance_documents
SELECT id, filename, user_id, created_at, mime_type, processing_status
FROM compliance_documents 
LIMIT 3;

-- Sample data from project_documents
SELECT id, filename, project_id, uploaded_by, created_at, visible_to_owners, owners_can_upload
FROM project_documents 
LIMIT 3;