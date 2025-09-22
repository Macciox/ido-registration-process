import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface Document {
  id: string;
  document_type: string;
  title: string;
  description: string;
  file_url?: string;
  link_url?: string;
  created_at: string;
}

const ProjectDocuments: React.FC = () => {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    document_type: 'launchpad',
    title: '',
    description: '',
    link_url: '',
    visible_to_owners: false,
    owners_can_upload: false
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && !formData.title) {
      setFormData({ ...formData, title: file.name.replace(/\.[^/.]+$/, '') });
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
          router.push('/login');
          return;
        }
        setUser(currentUser);
        
        if (projectId) {
          await loadProject();
          await loadDocuments();
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [projectId, router]);

  const loadProject = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    setProject(data);
  };

  const loadDocuments = async () => {
    const { data } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      if (selectedFile) {
        // Upload file
        const formDataUpload = new FormData();
        formDataUpload.append('file', selectedFile);
        formDataUpload.append('document_type', formData.document_type);
        formDataUpload.append('title', formData.title);
        formDataUpload.append('description', formData.description);
        formDataUpload.append('visible_to_owners', formData.visible_to_owners.toString());
        formDataUpload.append('owners_can_upload', formData.owners_can_upload.toString());

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/projects/${projectId}/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: formDataUpload,
        });



        if (!response.ok) throw new Error('Upload failed');
      } else {
        // Save link only
        const { error } = await supabase
          .from('project_documents')
          .insert({
            project_id: projectId,
            ...formData,
            uploaded_by: user.id,
            visible_to_owners: formData.visible_to_owners,
            owners_can_upload: formData.owners_can_upload
          });

        if (error) throw error;
      }

      setFormData({ 
        document_type: 'launchpad', 
        title: '', 
        description: '', 
        link_url: '',
        visible_to_owners: false,
        owners_can_upload: false
      });
      setSelectedFile(null);
      setShowForm(false);
      await loadDocuments();
    } catch (err: any) {
      console.error('Error adding document:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      await loadDocuments();
    } catch (err: any) {
      console.error('Error deleting document:', err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Project Documents</h1>
            <p className="text-text-secondary">{project?.name} - KYB & Legal Documents</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/admin/projects/${projectId}/settings`)}
              className="btn-dark" 
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            >
              ← Back to Project
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-dark"
            >
              Add Document
            </button>
          </div>
        </div>

        {showForm && (
          <div className="sleek-card p-6">
            <h3 className="text-lg font-medium text-white mb-4">Add New Document</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Document Section</label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  className="sleek-input w-full"
                >
                  <option value="launchpad">Launchpad</option>
                  <option value="tms">TMS</option>
                  <option value="marketing">Marketing</option>
                  <option value="legal">Legal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="sleek-input w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="sleek-input w-full h-24"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">File Upload</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="sleek-input w-full"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                />
                <p className="text-xs text-text-muted mt-1">Max 10MB. Supported: PDF, DOC, DOCX, TXT, JPG, PNG</p>
              </div>
              
              <div className="text-center text-text-muted">OR</div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Link URL</label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="sleek-input w-full"
                  placeholder="https://..."
                />
              </div>
              
              {/* Privacy Options */}
              <div className="bg-bg-secondary p-4 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium text-white mb-3">🔒 Privacy Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.visible_to_owners}
                      onChange={(e) => setFormData({ ...formData, visible_to_owners: e.target.checked })}
                      className="form-checkbox h-4 w-4 text-primary mr-3"
                    />
                    <div>
                      <span className="text-white text-sm">Visible to Project Owners</span>
                      <p className="text-text-secondary text-xs">Project owners can see and download this document</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.owners_can_upload}
                      onChange={(e) => setFormData({ ...formData, owners_can_upload: e.target.checked })}
                      className="form-checkbox h-4 w-4 text-primary mr-3"
                    />
                    <div>
                      <span className="text-white text-sm">Project Owners Can Upload</span>
                      <p className="text-text-secondary text-xs">Allow project owners to upload documents to this section</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  type="submit" 
                  className="btn-dark" 
                  disabled={uploading || (!selectedFile && !formData.link_url)}
                >
                  {uploading ? 'Uploading...' : 'Add Document'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedFile(null);
                  }}
                  className="btn-dark" 
                  style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Document Sections */}
        {['launchpad', 'tms', 'marketing', 'legal'].map((section) => {
          const sectionDocs = documents.filter(doc => doc.document_type === section);
          const sectionColors = {
            launchpad: 'status-success',
            tms: 'status-warning', 
            marketing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            legal: 'status-error'
          };
          
          return (
            <div key={section} className="sleek-card p-6">
              <h3 className="text-lg font-medium text-white mb-4 capitalize">
                {section === 'tms' ? 'TMS' : section} Documents
              </h3>
              
              {sectionDocs.length === 0 ? (
                <p className="text-text-muted">No {section} documents uploaded yet.</p>
              ) : (
                <div className="space-y-4">
                  {sectionDocs.map((doc) => (
                    <div key={doc.id} className="border border-white/10 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`status-badge ${sectionColors[section as keyof typeof sectionColors]}`}>
                              {section === 'tms' ? 'TMS' : section.toUpperCase()}
                            </span>
                            <h4 className="text-white font-medium">{doc.title}</h4>
                          </div>
                          
                          {doc.description && (
                            <p className="text-text-secondary text-sm mb-2">{doc.description}</p>
                          )}
                          
                          {doc.file_url && doc.file_url.includes('supabase') && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm mr-4"
                            >
                              📄 Download File
                            </a>
                          )}
                          
                          {doc.link_url && (
                            <a
                              href={doc.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              🔗 View Link →
                            </a>
                          )}
                          
                          <p className="text-text-muted text-xs mt-2">
                            Added {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="btn-dark"
                          style={{ background: 'rgba(240, 113, 97, 0.2)', color: '#F07161' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
};

export default ProjectDocuments;