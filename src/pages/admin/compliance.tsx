import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  checker_items: Array<{
    id: string;
    category: string;
    item_name: string;
    description: string;
    weight: number;
  }>;
}

interface Document {
  id: string;
  filename: string;
  file_path: string;
  created_at: string;
  compliance_checks: Array<{
    id: string;
    template_id: string;
    status: string;
    created_at: string;
    compliance_templates: {
      name: string;
      type: string;
    };
  }>;
}

export default function CompliancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'existing'>('upload');

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
      fetchTemplates();
      fetchDocuments();
    };
    init();
  }, [router]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/compliance/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Fetching documents with session:', session ? 'Present' : 'Missing');
      
      const response = await fetch('/api/compliance/documents', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      console.log('Documents response status:', response.status);
      const data = await response.json();
      console.log('Documents data:', data);
      
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedTemplate) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', selectedTemplate);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Starting upload with session:', session ? 'Present' : 'Missing');
      console.log('File:', file.name, 'Template:', selectedTemplate);
      
      const uploadResponse = await fetch('/api/compliance/upload-final', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData,
      });
      
      console.log('Upload response status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed - Status:', uploadResponse.status);
        console.error('Upload failed - Response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.message || errorData.error || `HTTP ${uploadResponse.status}`);
      }
      
      const uploadData = await uploadResponse.json();
      console.log('Upload successful:', uploadData);
      alert(`Upload successful! File: ${uploadData.filename}`);
      setFile(null);
      setSelectedTemplate('');
      fetchDocuments();
    } catch (error: any) {
      console.error('Upload error details:', error);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument || !selectedTemplate) return;

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/compliance/analyze-existing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          documentId: selectedDocument,
          templateId: selectedTemplate
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      
      const data = await response.json();
      setResults(data);
      setSelectedDocument('');
      setSelectedTemplate('');
    } catch (error) {
      console.error('Error:', error);
      alert('Error analyzing document');
    } finally {
      setIsUploading(false);
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

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">Admin access required</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">MiCA Compliance Checker</h1>
            <p className="text-text-secondary">AI-powered compliance analysis for documents</p>
          </div>
          <a href="/admin/tools" className="btn-secondary">
            ← Back to Tools
          </a>
        </div>

        <div className="sleek-card">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload New Document
              </button>
              <button
                onClick={() => setActiveTab('existing')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'existing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Analyze Existing Document
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'upload' ? (
              <form onSubmit={handleFileUpload} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Compliance Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    required
                  >
                    <option value="">Choose template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.checker_items?.length || 0} items)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload Document (PDF)
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full p-3 border rounded-lg"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !file || !selectedTemplate}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload & Analyze'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAnalyzeExisting} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Document
                  </label>
                  <select
                    value={selectedDocument}
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    required
                  >
                    <option value="">Choose document...</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.filename} ({new Date(doc.created_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Compliance Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    required
                  >
                    <option value="">Choose template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.checker_items?.length || 0} items)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !selectedDocument || !selectedTemplate}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg disabled:opacity-50"
                >
                  {isUploading ? 'Analyzing...' : 'Analyze Document'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}