-- COMPREHENSIVE DOCUMENT SYSTEM TEST
-- Run these queries step by step to verify everything works

-- 1. Verify database structure
SELECT 'project_documents structure' as test_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'project_documents'
ORDER BY ordinal_position;

-- 2. Test document creation with all permissions
INSERT INTO project_documents (
    project_id, 
    title, 
    description, 
    document_type, 
    file_url, 
    uploaded_by,
    visible_to_owners,
    owners_can_upload,
    owners_can_view,
    owners_can_edit,
    owners_can_delete,
    is_public
) VALUES (
    (SELECT id FROM projects LIMIT 1),
    'System Test Document',
    'Testing all permission fields',
    'general',
    'https://example.com/test.pdf',
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    true,   -- visible_to_owners (legacy)
    true,   -- owners_can_upload
    true,   -- owners_can_view (new)
    true,   -- owners_can_edit
    false,  -- owners_can_delete
    false   -- is_public
);

-- 3. Verify insertion worked
SELECT 'Test document created' as test_name;
SELECT id, title, visible_to_owners, owners_can_view, owners_can_edit, owners_can_delete
FROM project_documents 
WHERE title = 'System Test Document';

-- 4. Test project owner view (should see document)
SELECT 'Project owner view test' as test_name;
SELECT pd.title, pd.owners_can_view, pd.visible_to_owners, p.name as project_name
FROM project_documents pd
JOIN projects p ON pd.project_id = p.id
WHERE (pd.owners_can_view = true OR pd.visible_to_owners = true)
AND pd.title = 'System Test Document';

-- 5. Test upload permission check
SELECT 'Upload permission test' as test_name;
SELECT COUNT(*) as can_upload_count
FROM project_documents 
WHERE project_id = (SELECT project_id FROM project_documents WHERE title = 'System Test Document' LIMIT 1)
AND owners_can_upload = true;

-- 6. Test edit permission
SELECT 'Edit permission test' as test_name;
SELECT title, owners_can_edit
FROM project_documents 
WHERE title = 'System Test Document'
AND owners_can_edit = true;

-- 7. Test delete permission (should be false)
SELECT 'Delete permission test' as test_name;
SELECT title, owners_can_delete
FROM project_documents 
WHERE title = 'System Test Document'
AND owners_can_delete = false;

-- 8. Test compliance_documents structure (different table)
SELECT 'compliance_documents structure' as test_name;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'compliance_documents'
ORDER BY ordinal_position;

-- 9. Test foreign key constraints
SELECT 'Foreign key constraints' as test_name;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('project_documents', 'compliance_documents');

-- 10. Cleanup test data
DELETE FROM project_documents WHERE title = 'System Test Document';

-- 11. Final verification
SELECT 'Cleanup verification' as test_name;
SELECT COUNT(*) as remaining_test_docs
FROM project_documents 
WHERE title LIKE '%Test%';

-- 12. Summary of system capabilities
SELECT 'System Summary' as test_name;
SELECT 
    'project_documents' as table_name,
    COUNT(*) as total_documents,
    COUNT(CASE WHEN owners_can_view = true THEN 1 END) as viewable_by_owners,
    COUNT(CASE WHEN owners_can_edit = true THEN 1 END) as editable_by_owners,
    COUNT(CASE WHEN owners_can_delete = true THEN 1 END) as deletable_by_owners,
    COUNT(CASE WHEN owners_can_upload = true THEN 1 END) as upload_enabled_docs,
    COUNT(CASE WHEN is_public = true THEN 1 END) as public_documents
FROM project_documents;