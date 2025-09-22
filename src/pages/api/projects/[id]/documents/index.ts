import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check if user is admin or project owner
  const { data: project } = await serviceClient
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  const isOwner = project?.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Access denied' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(res, projectId as string, isAdmin);
    case 'POST':
      return handlePost(req, res, projectId as string, user.id, isAdmin);
    case 'PUT':
      return handlePut(req, res, user.id, isAdmin);
    case 'DELETE':
      return handleDelete(req, res, user.id, isAdmin);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(res: NextApiResponse, projectId: string, isAdmin: boolean) {
  const { data: documents, error } = await serviceClient
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }

  res.status(200).json({ documents });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, projectId: string, userId: string, isAdmin: boolean) {
  const { title, description, document_type, file_url, link_url, permissions } = req.body;

  // Validate required fields
  if (!title || !document_type) {
    return res.status(400).json({ error: 'Title and document_type are required' });
  }

  // Project owners can only upload if they have permission
  if (!isAdmin) {
    const { data: uploadPermission } = await serviceClient
      .from('project_documents')
      .select('owners_can_upload')
      .eq('project_id', projectId)
      .eq('owners_can_upload', true)
      .limit(1)
      .single();
    
    if (!uploadPermission) {
      return res.status(403).json({ error: 'Upload permission denied' });
    }
  }

  const documentData = {
    project_id: projectId,
    title: title.trim(),
    description: description?.trim() || null,
    document_type,
    file_url: file_url?.trim() || null,
    link_url: link_url?.trim() || null,
    uploaded_by: userId,
    visible_to_owners: isAdmin ? (permissions?.visible_to_owners ?? true) : true,
    owners_can_upload: isAdmin ? (permissions?.owners_can_upload ?? false) : false,
    owners_can_view: isAdmin ? (permissions?.owners_can_view ?? true) : true,
    owners_can_edit: isAdmin ? (permissions?.owners_can_edit ?? false) : false,
    owners_can_delete: isAdmin ? (permissions?.owners_can_delete ?? false) : false,
    is_public: isAdmin ? (permissions?.is_public ?? false) : false
  };

  const { data: document, error } = await serviceClient
    .from('project_documents')
    .insert(documentData)
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to create document' });
  }

  res.status(201).json({ document });
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, userId: string, isAdmin: boolean) {
  const { documentId, title, description, permissions } = req.body;

  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  // Check if document exists and get current permissions
  const { data: existingDoc, error: fetchError } = await serviceClient
    .from('project_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !existingDoc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check permissions for project owners
  if (!isAdmin) {
    if (!existingDoc.owners_can_edit && existingDoc.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Edit permission denied' });
    }
  }

  const updateData: any = { 
    title: title?.trim() || existingDoc.title,
    description: description?.trim() || existingDoc.description,
    updated_at: new Date().toISOString()
  };
  
  // Only admins can change permissions
  if (isAdmin && permissions) {
    updateData.visible_to_owners = permissions.visible_to_owners;
    updateData.owners_can_upload = permissions.owners_can_upload;
    updateData.owners_can_view = permissions.owners_can_view;
    updateData.owners_can_edit = permissions.owners_can_edit;
    updateData.owners_can_delete = permissions.owners_can_delete;
    updateData.is_public = permissions.is_public;
  }

  const { data: document, error } = await serviceClient
    .from('project_documents')
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }

  res.status(200).json({ document });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, userId: string, isAdmin: boolean) {
  const { documentId } = req.body;

  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  // Check if document exists and get permissions
  const { data: existingDoc, error: fetchError } = await serviceClient
    .from('project_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !existingDoc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check permissions for project owners
  if (!isAdmin) {
    if (!existingDoc.owners_can_delete && existingDoc.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Delete permission denied' });
    }
  }

  const { error } = await serviceClient
    .from('project_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }

  res.status(200).json({ success: true });
}