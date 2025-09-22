import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/layout/Layout';

interface Document {
  id: string;
  title: string;
  description?: string;
  document_type: string;
  file_url?: string;
  link_url?: string;
  visible_to_owners: boolean;
  owners_can_upload: boolean;
  owners_can_view: boolean;
  owners_can_edit: boolean;
  owners_can_delete: boolean;
  is_public: boolean;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function ProjectOwnerDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'general',
    file_url: '',
    link_url: ''
  });

  useEffect(() => {
    fetchProjectAndDocuments();
  }, []);

  const fetchProjectAndDocuments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get user's project
    const { data: userProject } = await supabase
      .from('projects')
      .select('id, name')
      .eq('owner_id', session.user.id)
      .single();

    if (!userProject) {
      setLoading(false);
      return;
    }

    setProject(userProject);

    // Get documents user can see
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const response = await fetch(`/api/projects/${userProject.id}/documents`, {
      headers: { Authorization: `Bearer ${currentSession?.access_token}` }
    });
    
    if (response.ok) {
      const { documents } = await response.json();
      // Filter only visible documents - use owners_can_view if available, fallback to visible_to_owners
      const visibleDocs = documents.filter((doc: Document) => 
        doc.owners_can_view !== undefined ? doc.owners_can_view : doc.visible_to_owners || doc.uploaded_by === session.user.id
      );
      setDocuments(visibleDocs);
    }
    
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const method = editingDoc ? 'PUT' : 'POST';
    const body = editingDoc 
      ? { documentId: editingDoc.id, ...formData }
      : formData;

    const response = await fetch(`/api/projects/${project.id}/documents`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      fetchProjectAndDocuments();
      setShowUploadForm(false);
      setEditingDoc(null);
      setFormData({
        title: '',
        description: '',
        document_type: 'general',
        file_url: '',
        link_url: ''
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(`/api/projects/${project?.id}/documents`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ documentId })
    });

    if (response.ok) {
      fetchProjectAndDocuments();
    }
  };

  const startEdit = (doc: Document) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      description: doc.description || '',
      document_type: doc.document_type,
      file_url: doc.file_url || '',
      link_url: doc.link_url || ''
    });
    setShowUploadForm(true);
  };

  // Check if user can upload - either they have upload permission or they're the project owner with at least one document allowing upload
  const canUpload = documents.some(doc => doc.owners_can_upload) || documents.length === 0;

  if (loading) {
    return (
      <Layout>
        <div className="p-6">Loading...</div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Project Found</h2>
            <p className="text-gray-600">You don't have a project assigned yet.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Project Documents</h1>
              <p className="text-gray-600 mt-1">Project: {project.name}</p>
            </div>
            {canUpload && (
              <button
                onClick={() => setShowUploadForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Upload Document
              </button>
            )}
          </div>
        </div>

        {showUploadForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">
              {editingDoc ? 'Edit Document' : 'Upload New Document'}
            </h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Document Type</label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="general">General</option>
                  <option value="whitepaper">Whitepaper</option>
                  <option value="tokenomics">Tokenomics</option>
                  <option value="legal">Legal</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">File URL</label>
                <input
                  type="url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Link URL</label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  {editingDoc ? 'Update' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setEditingDoc(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Your Documents</h3>
            
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No documents available</p>
                {!canUpload && (
                  <p className="text-sm text-gray-400 mt-2">
                    Contact admin to enable document upload permissions
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{doc.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Type: {doc.document_type}</span>
                          {doc.file_url && (
                            <a 
                              href={doc.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View File
                            </a>
                          )}
                          {doc.link_url && (
                            <a 
                              href={doc.link_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              External Link
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {doc.owners_can_edit && (
                          <button
                            onClick={() => startEdit(doc)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                        )}
                        {doc.owners_can_delete && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-blue-50 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-blue-900 mb-2">Your Permissions</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>✅ You can view documents marked as visible to owners</p>
            {canUpload && <p>✅ You can upload new documents</p>}
            <p>📝 Edit/Delete permissions are set per document by admin</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}