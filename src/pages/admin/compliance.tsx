import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { LoadingButton, LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
  const [recentUrls, setRecentUrls] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>('');
  const [batchSize, setBatchSize] = useState<number>(5);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'existing' | 'url' | 'saved'>('upload');
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [selectedDocumentForVersions, setSelectedDocumentForVersions] = useState<string>('');
  const [versions, setVersions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [deletingAnalysis, setDeletingAnalysis] = useState<string>('');
  const { showToast, ToastContainer } = useToast();

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
      fetchRecentUrls();
      fetchSavedAnalyses();
    };
    init();
  }, [router]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/compliance/templates?t=${Date.now()}`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchSavedAnalyses = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (minScore) params.append('minScore', minScore);
      if (maxScore) params.append('maxScore', maxScore);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/analyses?${params}`);
      const data = await response.json();
      setSavedAnalyses(data.analyses || []);
    } catch (error) {
      console.error('Error fetching saved analyses:', error);
      showToast('Failed to fetch analyses', 'error');
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSavedAnalyses();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, minScore, maxScore, statusFilter]);

  const handleSaveAnalysis = async (overwrite: boolean) => {
    if (!results) return;
    
    setSaving(true);
    try {
      // Use the template that was ACTUALLY used for analysis
      const templateIdToUse = results.actualTemplateUsed || results.templateId || selectedTemplate;
      console.log('Saving analysis with CORRECT template:', {
        actualTemplateUsed: results.actualTemplateUsed,
        resultsTemplateId: results.templateId,
        selectedTemplate,
        usingTemplateId: templateIdToUse,
        resultsCount: results.results?.length || 0
      });
      
      const response = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: results.documentId || selectedDocument,
          docName: documents.find(d => d.id === (results.documentId || selectedDocument))?.filename || 'Unknown Document',
          templateId: templateIdToUse,
          analysisResults: {
            results: results.results,
            summary: results.summary
          },
          overwrite: overwrite
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showToast(data.message, 'success');
        fetchSavedAnalyses();
      } else {
        throw new Error(data.error);
      }

    } catch (error: any) {
      showToast('Save failed: ' + error.message, 'error');
    } finally {
      setSaving(false);
      setShowSaveModal(false);
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

  const fetchRecentUrls = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/compliance/recent-urls', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const data = await response.json();
      setRecentUrls(data.recentUrls || []);
    } catch (error) {
      console.error('Error fetching recent URLs:', error);
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

  const handleAnalyzeURL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !selectedTemplate) return;

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/compliance/analyze-url', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          url: url,
          templateId: selectedTemplate,
          batchSize: batchSize
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'URL analysis failed');
      }
      
      const data = await response.json();
      
      // Debug: log the full response
      console.log('🔍 FULL API RESPONSE:', JSON.stringify(data, null, 2));
      console.log('📊 Results count:', data.results?.length || 0);
      console.log('🎯 First result example:', data.results?.[0]);
      
      setResults({
        ...data,
        actualTemplateUsed: selectedTemplate
      });
      setShowResults(true);
      setUrl('');
      // setSelectedTemplate(''); // Keep for saving
      
      // Refresh recent URLs list
      fetchRecentUrls();
      
      showToast(`Website analyzed successfully! ${data.processing?.chunksCount || 0} sections processed.`, 'success');
    } catch (error: any) {
      console.error('Error:', error);
      showToast('Error analyzing website: ' + error.message, 'error');
      setShowResults(false);
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
      
      setResults({
        ...data,
        documentId: selectedDocument,
        templateId: selectedTemplate,
        actualTemplateUsed: selectedTemplate // Store the ACTUAL template used
      });
      setShowResults(true);
      // Don't reset selectedTemplate until after potential save
      setSelectedDocument('');
      // setSelectedTemplate(''); // Keep this for saving
      
      // Analysis completed (not saved)
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error analyzing document: ' + error.message);
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
              <button
                onClick={() => setActiveTab('url')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'url'
                    ? 'bg-primary text-white'
                    : 'bg-card-secondary text-text-secondary hover:bg-primary/20 hover:text-white'
                }`}
              >
                🌐 Analyze URL
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'saved'
                    ? 'bg-primary text-white'
                    : 'bg-card-secondary text-text-secondary hover:bg-primary/20 hover:text-white'
                }`}
              >
                Saved Analyses ({savedAnalyses.length})
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
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload & Analyze'}
                </button>
              </form>
            ) : activeTab === 'existing' ? (
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
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Analyzing...' : 'Analyze Document'}
                </button>
              </form>
            ) : activeTab === 'url' ? (
              <div className="space-y-6">
                <form onSubmit={handleAnalyzeURL} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://docs.example.com/whitepaper"
                      className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400"
                      required
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      📝 Examples: Documentation sites, Medium articles, GitBook pages
                    </p>
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

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Analysis Speed
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                  >
                    <option value={1}>🐌 Thorough (1 item per call) - Most accurate</option>
                    <option value={3}>⚡ Balanced (3 items per call) - Good balance</option>
                    <option value={5}>🚀 Fast (Single call for all items) - Fastest & cheapest</option>
                  </select>
                  <p className="text-xs text-text-secondary mt-1">
                    💡 Fast mode uses single call for all items. Thorough/Balanced use multiple calls for higher accuracy.
                  </p>
                </div>

                  <button
                    type="submit"
                    disabled={isUploading || !url || !selectedTemplate}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Analyzing Website...' : '🌐 Analyze Website'}
                  </button>
                </form>

                {/* Recently Analyzed URLs */}
                {recentUrls.length > 0 && (
                  <div className="border-t border-border pt-6">
                    <h3 className="text-lg font-medium text-white mb-4">Recently Analyzed</h3>
                    <div className="space-y-2">
                      {recentUrls.map((urlDoc) => (
                        <div key={urlDoc.id} className="flex items-center justify-between p-3 bg-card-secondary rounded-lg">
                          <div className="flex-1">
                            <div className="text-white font-medium">{urlDoc.filename}</div>
                            <div className="text-sm text-text-secondary">
                              {urlDoc.file_path} • {new Date(urlDoc.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => setUrl(urlDoc.file_path)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                          >
                            Use URL
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 mb-6">
                  <h3 className="text-lg font-medium text-white">Saved Analyses</h3>
                  
                  {/* Search and Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="Search by name, hash, or version..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-2 bg-card-secondary border border-border rounded-lg text-white placeholder-text-secondary"
                    />
                    <input
                      type="number"
                      placeholder="Min Score"
                      value={minScore}
                      onChange={(e) => setMinScore(e.target.value)}
                      className="px-3 py-2 bg-card-secondary border border-border rounded-lg text-white placeholder-text-secondary"
                    />
                    <input
                      type="number"
                      placeholder="Max Score"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      className="px-3 py-2 bg-card-secondary border border-border rounded-lg text-white placeholder-text-secondary"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-card-secondary border border-border rounded-lg text-white"
                    >
                      <option value="">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                {savedAnalyses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-text-secondary">No saved analyses found</div>
                    <p className="text-sm text-text-secondary mt-2">Complete and save an analysis to see it here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-white font-medium">Document</th>
                          <th className="text-left py-3 px-4 text-white font-medium">Template</th>
                          <th className="text-left py-3 px-4 text-white font-medium">Hash</th>
                          <th className="text-left py-3 px-4 text-white font-medium">Score</th>
                          <th className="text-left py-3 px-4 text-white font-medium">Version</th>
                          <th className="text-left py-3 px-4 text-white font-medium">Date</th>
                          <th className="text-left py-3 px-4 text-white font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedAnalyses.map((analysis) => (
                          <tr key={`${analysis.document_id}-${analysis.version}`} className="border-b border-border/50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="text-white font-medium">{analysis.filename}</div>
                                <div className="text-sm text-text-secondary">
                                  Found: {analysis.found_items} | 
                                  Clarification: {analysis.clarification_items} | 
                                  Missing: {analysis.missing_items}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-white text-sm">
                                <div className="font-medium">{analysis.template_name}</div>
                                <div className="text-xs text-text-secondary">
                                  {analysis.template_name?.includes('Legal') ? '⚖️ Legal' : 
                                   analysis.template_name?.includes('Whitepaper') ? '📄 Whitepaper' : '📋 Other'}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <code className="text-xs text-text-secondary bg-card-secondary px-2 py-1 rounded">
                                {analysis.doc_hash?.substring(0, 12)}...
                              </code>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-2 ${
                                  analysis.overall_score >= 80 ? 'bg-green-500' :
                                  analysis.overall_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                                <span className="text-white">{analysis.overall_score}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-white">v{analysis.version}</td>
                            <td className="py-3 px-4 text-text-secondary">
                              {new Date(analysis.analysis_created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/compliance/get-analysis?checkId=${analysis.check_id}`);
                                      const data = await response.json();
                                      setResults(data);
                                      setShowResults(true);
                                    } catch (error) {
                                      showToast('Error loading analysis', 'error');
                                    }
                                  }}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                                >
                                  View
                                </button>
                                <button
                                  onClick={async () => {
                                    setSelectedDocumentForVersions(analysis.document_id);
                                    setLoadingVersions(true);
                                    setShowVersionsModal(true);
                                    try {
                                      const response = await fetch(`/api/analysis/${analysis.document_id}/versions`);
                                      const data = await response.json();
                                      setVersions(data.versions || []);
                                    } catch (error) {
                                      showToast('Error loading versions', 'error');
                                    } finally {
                                      setLoadingVersions(false);
                                    }
                                  }}
                                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                                >
                                  Versions
                                </button>
                                {analysis.document_url && (
                                  <button
                                    onClick={() => window.open(analysis.document_url, '_blank')}
                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                                  >
                                    Download
                                  </button>
                                )}
                                <LoadingButton
                                  loading={deletingAnalysis === analysis.check_id}
                                  onClick={async () => {
                                    if (!confirm('Are you sure you want to delete this analysis?')) return;
                                    
                                    setDeletingAnalysis(analysis.check_id);
                                    try {
                                      const response = await fetch(`/api/analysis/${analysis.check_id}`, {
                                        method: 'DELETE'
                                      });
                                      const data = await response.json();
                                      
                                      if (data.success) {
                                        showToast(data.message, 'success');
                                        fetchSavedAnalyses();
                                      } else {
                                        throw new Error(data.error);
                                      }
                                    } catch (error: any) {
                                      showToast('Delete failed: ' + error.message, 'error');
                                    } finally {
                                      setDeletingAnalysis('');
                                    }
                                  }}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                                >
                                  Delete
                                </LoadingButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showResults && results && (
          <div className="sleek-card">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Analysis Results</h2>
                  {results.templateName && (
                    <p className="text-sm text-text-secondary mt-1">
                      📋 Template: <span className="text-primary font-medium">{results.templateName}</span>
                      {results.version && <span className="ml-2">• Version {results.version}</span>}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowResults(false)}
                  className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
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

              {/* Analyzed Text Section (for URL analysis) */}
              {results.documentId && (
                <div className="mt-8">
                  <div className="border-t border-border pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">📄 Analyzed Website Content</h3>
                      <div className="text-sm text-text-secondary">
                        {results.processing.pagesCount || 1} pages • {results.processing.chunksCount} sections • {results.processing.totalWords} words
                      </div>
                    </div>
                    
                    <div className="bg-card-secondary rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div className="text-sm text-text-secondary mb-2">
                        Source: <a href={results.processing?.url || '#'} target="_blank" className="text-primary hover:underline">
                          {results.processing?.title || 'Website Analysis'}
                        </a>
                      </div>
                      
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/debug/chunks?documentId=${results.documentId}`);
                            const data = await response.json();
                            
                            const fullText = data.chunks.map((chunk: any) => chunk.fullContent).join('\n\n');
                            
                            const newWindow = window.open('', '_blank');
                            if (newWindow) {
                              newWindow.document.write(`
                                <html>
                                  <head><title>Analyzed Content - ${results.processing.title}</title></head>
                                  <body style="font-family: Arial; padding: 20px; line-height: 1.6;">
                                    <h1>Analyzed Website Content</h1>
                                    <p><strong>Source:</strong> ${results.processing?.title || 'Website'}</p>
                                    <p><strong>Pages:</strong> ${results.processing?.pagesCount || 1} pages crawled</p>
                                    <p><strong>Chunks:</strong> ${data.totalChunks} sections</p>
                                    <hr>
                                    <pre style="white-space: pre-wrap; font-family: inherit;">${fullText}</pre>
                                  </body>
                                </html>
                              `);
                              newWindow.document.close();
                            }
                          } catch (error) {
                            alert('Error loading content: ' + error);
                          }
                        }}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                      >
                        📖 View Full Analyzed Text
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6">
                <button 
                  onClick={() => setShowSaveModal(true)}
                  className="px-4 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium transition-colors"
                >
                  💾 Save Analysis
                </button>
                <button 
                  onClick={() => window.open(`/api/compliance/export?checkId=${results.checkId}&format=json`)}
                  className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Export JSON
                </button>
                <button 
                  onClick={() => window.open(`/api/compliance/export?checkId=${results.checkId}&format=pdf`)}
                  className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Export PDF
                </button>
                <button 
                  onClick={() => handleRegenerate()}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Regenerate Non-FOUND
                </button>
                <button 
                  onClick={() => testAnalysis()}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Test Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Analysis Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-white mb-4">Save Analysis</h3>
              <p className="text-text-secondary mb-6">
                How would you like to save this analysis?
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleSaveAnalysis(false)}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : '✨ Save as New Version'}
                </button>
                
                <button
                  onClick={() => handleSaveAnalysis(true)}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : '🔄 Overwrite Existing'}
                </button>
                
                <button
                  onClick={() => setShowSaveModal(false)}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Versions Modal */}
        {showVersionsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Document Versions</h3>
                <button
                  onClick={() => setShowVersionsModal(false)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              {loadingVersions ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-white font-medium">Version</th>
                        <th className="text-left py-3 px-4 text-white font-medium">Score</th>
                        <th className="text-left py-3 px-4 text-white font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-white font-medium">Date</th>
                        <th className="text-left py-3 px-4 text-white font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((version) => (
                        <tr key={version.id} className="border-b border-border/50">
                          <td className="py-3 px-4 text-white">v{version.version}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-2 ${
                                version.overall_score >= 80 ? 'bg-green-500' :
                                version.overall_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-white">{version.overall_score}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              version.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              version.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {version.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-text-secondary">
                            {new Date(version.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/compliance/get-analysis?checkId=${version.id}`);
                                  const data = await response.json();
                                  setResults(data);
                                  setShowResults(true);
                                  setShowVersionsModal(false);
                                } catch (error) {
                                  showToast('Error loading version', 'error');
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {versions.length === 0 && (
                    <div className="text-center py-8 text-text-secondary">
                      No versions found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    </Layout>
  );
}