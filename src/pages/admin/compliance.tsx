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
  const [showResults, setShowResults] = useState(false);

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

  const handleRegenerate = async () => {
    if (!results?.checkId) return;
    
    try {
      const response = await fetch('/api/compliance/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkId: results.checkId })
      });
      
      const data = await response.json();
      alert(`Regenerated ${data.updated_items} items`);
      console.log('Regeneration result:', data);
    } catch (error) {
      console.error('Regenerate error:', error);
      alert('Regeneration failed');
    }
  };

  const testAnalysis = async () => {
    if (!documents.length) {
      alert('No documents available for testing');
      return;
    }

    const testDoc = documents[0];
    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/compliance/test-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          documentId: testDoc.id,
          testQuery: 'token economics distribution'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Test successful!\n\nIngestion: ${result.ingestion.chunks_created} chunks\nRetrieval: ${result.retrieval.chunks_found} relevant chunks\nGPT API: ${result.gpt_api.success ? 'Working' : 'Failed'}`);
        console.log('Test results:', result);
      } else {
        alert(`Test failed: ${result.error}`);
        console.error('Test error:', result);
      }
    } catch (error: any) {
      console.error('Test error:', error);
      alert('Test failed: ' + (error.message || 'Unknown error'));
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
      const response = await fetch('/api/compliance/analyze-nosave', {
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
      setShowResults(true);
      setSelectedDocument('');
      setSelectedTemplate('');
    } catch (error) {
      console.error('Error:', error);
      alert('Error analyzing document');
      setShowResults(false);
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
          <button 
            onClick={() => router.push('/admin/tools')}
            className="btn-secondary"
          >
            ← Back to Tools
          </button>
        </div>

        <div className="sleek-card">
          <div className="p-6 border-b border-border">
            <nav className="flex gap-3">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-primary text-white'
                    : 'bg-card-secondary text-text-secondary hover:bg-primary/20 hover:text-white'
                }`}
              >
                Upload New Document
              </button>
              <button
                onClick={() => setActiveTab('existing')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'existing'
                    ? 'bg-primary text-white'
                    : 'bg-card-secondary text-text-secondary hover:bg-primary/20 hover:text-white'
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
                  <label className="block text-sm font-medium mb-2 text-white">
                    Select Compliance Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                    required
                  >
                    <option value="" className="bg-card text-white">Choose template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id} className="bg-card text-white">
                        {template.name} ({template.checker_items?.length || 0} items)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Upload Document (PDF)
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full p-3 border border-border rounded-lg bg-card text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !file || !selectedTemplate}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload & Analyze'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAnalyzeExisting} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Select Document
                  </label>
                  <select
                    value={selectedDocument}
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                    required
                  >
                    <option value="" className="bg-card text-white">Choose document...</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id} className="bg-card text-white">
                        {doc.filename} ({new Date(doc.created_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Select Compliance Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                    required
                  >
                    <option value="" className="bg-card text-white">Choose template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id} className="bg-card text-white">
                        {template.name} ({template.checker_items?.length || 0} items)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !selectedDocument || !selectedTemplate}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {isUploading ? 'Analyzing...' : 'Analyze Document'}
                </button>
              </form>
            )}
          </div>
        </div>

        {showResults && results && (
          <div className="sleek-card">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Analysis Results</h2>
                <button
                  onClick={() => setShowResults(false)}
                  className="btn-secondary"
                >
                  Close Results
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {results.summary?.found_items || 0}
                  </div>
                  <div className="text-green-300 text-sm">Found</div>
                </div>
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-400">
                    {results.summary?.clarification_items || 0}
                  </div>
                  <div className="text-yellow-300 text-sm">Needs Clarification</div>
                </div>
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-400">
                    {results.summary?.missing_items || 0}
                  </div>
                  <div className="text-red-300 text-sm">Missing</div>
                </div>
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {results.summary?.overall_score || 0}%
                  </div>
                  <div className="text-blue-300 text-sm">Overall Score</div>
                </div>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-white font-medium">Item</th>
                      <th className="text-left py-3 px-4 text-white font-medium">Category</th>
                      <th className="text-left py-3 px-4 text-white font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-white font-medium">Score</th>
                      <th className="text-left py-3 px-4 text-white font-medium">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results?.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-3 px-4 text-white">{item.item_name}</td>
                        <td className="py-3 px-4 text-text-secondary">{item.category}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'FOUND' ? 'bg-green-500/20 text-green-400' :
                            item.status === 'NEEDS_CLARIFICATION' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {item.status === 'FOUND' ? '✅' : item.status === 'NEEDS_CLARIFICATION' ? '⚠️' : '❌'}
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white">{item.coverage_score}%</td>
                        <td className="py-3 px-4">
                          {item.evidence?.length > 0 ? (
                            <button 
                              className="text-blue-400 hover:text-blue-300 text-sm"
                              title={item.evidence[0].snippet}
                            >
                              View Evidence ({item.evidence.length})
                            </button>
                          ) : (
                            <span className="text-text-secondary text-sm">No evidence</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => window.open(`/api/compliance/export?checkId=${results.checkId}&format=json`)}
                  className="btn-secondary"
                >
                  Export JSON
                </button>
                <button 
                  onClick={() => window.open(`/api/compliance/export?checkId=${results.checkId}&format=md`)}
                  className="btn-secondary"
                >
                  Export Markdown
                </button>
                <button 
                  onClick={() => window.open(`/api/compliance/export?checkId=${results.checkId}&format=pdf`)}
                  className="btn-secondary"
                >
                  Export PDF
                </button>
                <button 
                  onClick={() => handleRegenerate()}
                  className="btn-primary"
                >
                  Regenerate Non-FOUND
                </button>
                <button 
                  onClick={() => testAnalysis()}
                  className="btn-secondary"
                >
                  Test Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}