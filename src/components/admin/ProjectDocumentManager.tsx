import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

interface ProjectDocumentManagerProps {
  projectId: string;
  isAdmin: boolean;
}

export default function ProjectDocumentManager({ projectId, isAdmin }: ProjectDocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'general',
    file_url: '',
    link_url: '',
    permissions: {
      visible_to_owners: true,
      owners_can_upload: false,
      owners_can_view: true,
      owners_can_edit: false,
      owners_can_delete: false,
      is_public: false
    }
  });

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const fetchDocuments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(`/api/projects/${projectId}/documents`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    
    if (response.ok) {
      const { documents } = await response.json();
      setDocuments(documents);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const method = editingDoc ? 'PUT' : 'POST';
    const body = editingDoc 
      ? { documentId: editingDoc.id, ...formData }
      : formData;

    const response = await fetch(`/api/projects/${projectId}/documents`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      fetchDocuments();
      setShowForm(false);
      setEditingDoc(null);
      setFormData({
        title: '',
        description: '',
        document_type: 'general',
        file_url: '',
        link_url: '',
        permissions: {
          visible_to_owners: true,
          owners_can_upload: false,
          owners_can_view: true,
          owners_can_edit: false,
          owners_can_delete: false,
          is_public: false
        }
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(`/api/projects/${projectId}/documents`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ documentId })
    });

    if (response.ok) {
      fetchDocuments();
    }
  };

  const startEdit = (doc: Document) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      description: doc.description || '',
      document_type: doc.document_type,
      file_url: doc.file_url || '',
      link_url: doc.link_url || '',
      permissions: {
        visible_to_owners: doc.visible_to_owners,
        owners_can_upload: doc.owners_can_upload,
        owners_can_view: doc.owners_can_view,
        owners_can_edit: doc.owners_can_edit,
        owners_can_delete: doc.owners_can_delete,
        is_public: doc.is_public
      }
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Project Documents</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Document
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded space-y-4">
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

          {isAdmin && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Project Owner Permissions</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries({
                  visible_to_owners: 'Can View',
                  owners_can_upload: 'Can Upload',
                  owners_can_edit: 'Can Edit',
                  owners_can_delete: 'Can Delete',
                  is_public: 'Public Document'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permissions[key as keyof typeof formData.permissions]}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions,
                          [key]: e.target.checked
                        }
                      })}
                      className="mr-2"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {editingDoc ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingDoc(null);
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {documents.map((doc) => (
          <div key={doc.id} className="border rounded p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{doc.title}</h4>
                <p className="text-sm text-gray-600">{doc.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Type: {doc.document_type}</span>
                  {doc.file_url && <span>File: ✓</span>}
                  {doc.link_url && <span>Link: ✓</span>}
                </div>
                {isAdmin && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500">Permissions: </span>
                    {doc.visible_to_owners && <span className="bg-green-100 px-1 rounded">View</span>}
                    {doc.owners_can_edit && <span className="bg-blue-100 px-1 rounded ml-1">Edit</span>}
                    {doc.owners_can_delete && <span className="bg-red-100 px-1 rounded ml-1">Delete</span>}
                    {doc.is_public && <span className="bg-yellow-100 px-1 rounded ml-1">Public</span>}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(doc)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}