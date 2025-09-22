import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DocumentUploaderProps {
  projectId?: string;
  onUploadComplete?: (document: any) => void;
  showPermissions?: boolean;
  isAdmin?: boolean;
  acceptedTypes?: string;
  maxSize?: number;
}

export default function DocumentUploader({ 
  projectId, 
  onUploadComplete, 
  showPermissions = false, 
  isAdmin = false,
  acceptedTypes = ".pdf,.doc,.docx",
  maxSize = 10 * 1024 * 1024 // 10MB
}: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > maxSize) {
        alert(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
        return;
      }
      setFile(selectedFile);
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: selectedFile.name.replace(/\.[^/.]+$/, "")
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !formData.file_url && !formData.link_url) {
      alert('Please select a file or provide a URL');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      if (file && projectId) {
        // Upload file for project documents
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('title', formData.title);
        uploadFormData.append('description', formData.description);
        uploadFormData.append('document_type', formData.document_type);
        
        if (showPermissions && isAdmin) {
          Object.entries(formData.permissions).forEach(([key, value]) => {
            uploadFormData.append(key, value.toString());
          });
        }

        const response = await fetch(`/api/projects/${projectId}/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: uploadFormData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        onUploadComplete?.(result.document);
      } else {
        // Create document record without file upload
        const response = await fetch(`/api/projects/${projectId}/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            ...formData,
            permissions: showPermissions && isAdmin ? formData.permissions : undefined
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Creation failed');
        }

        const result = await response.json();
        onUploadComplete?.(result.document);
      }

      // Reset form
      setFile(null);
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

    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Document Type</label>
        <select
          value={formData.document_type}
          onChange={(e) => setFormData(prev => ({ ...prev, document_type: e.target.value }))}
          className="w-full border rounded px-3 py-2"
        >
          <option value="general">General</option>
          <option value="whitepaper">Whitepaper</option>
          <option value="tokenomics">Tokenomics</option>
          <option value="legal">Legal</option>
          <option value="technical">Technical</option>
          <option value="compliance">Compliance</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Upload File</label>
        <input
          type="file"
          accept={acceptedTypes}
          onChange={handleFileChange}
          className="w-full border rounded px-3 py-2"
        />
        {file && (
          <p className="text-sm text-gray-600 mt-1">
            Selected: {file.name} ({Math.round(file.size / 1024)}KB)
          </p>
        )}
      </div>

      <div className="text-center text-sm text-gray-500">OR</div>

      <div>
        <label className="block text-sm font-medium mb-1">File URL</label>
        <input
          type="url"
          value={formData.file_url}
          onChange={(e) => setFormData(prev => ({ ...prev, file_url: e.target.value }))}
          className="w-full border rounded px-3 py-2"
          placeholder="https://example.com/document.pdf"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Link URL</label>
        <input
          type="url"
          value={formData.link_url}
          onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
          className="w-full border rounded px-3 py-2"
          placeholder="https://docs.example.com"
        />
      </div>

      {showPermissions && isAdmin && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Project Owner Permissions</h4>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries({
              visible_to_owners: 'Can View (Legacy)',
              owners_can_view: 'Can View',
              owners_can_upload: 'Can Upload',
              owners_can_edit: 'Can Edit',
              owners_can_delete: 'Can Delete',
              is_public: 'Public Document'
            }).map(([key, label]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.permissions[key as keyof typeof formData.permissions]}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      [key]: e.target.checked
                    }
                  }))}
                  className="mr-2"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || (!file && !formData.file_url && !formData.link_url)}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Upload Document'}
      </button>
    </form>
  );
}