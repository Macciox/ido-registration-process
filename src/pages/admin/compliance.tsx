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
  const [analysisMode, setAnalysisMode] = useState<'fast' | 'normal'>('fast');
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
  const [regenerating, setRegenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string>('');
  const [whitepaperSections, setWhitepaperSections] = useState<string[]>(['A']);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceData, setEvidenceData] = useState<{title: string, evidence: any[]}>({title: '', evidence: []});
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
    if (!results?.results) {
      showToast('No results to regenerate', 'error');
      return;
    }
    
    // Find non-FOUND items
    const nonFoundItems = results.results.filter((item: any) => item.status !== 'FOUND');
    
    if (nonFoundItems.length === 0) {
      showToast('All items already found! Nothing to regenerate.', 'info');
      return;
    }
    
    setRegenerating(true);
    try {
      const response = await fetch('/api/compliance/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId: results.documentId,
          templateId: results.templateId || results.actualTemplateUsed,
          nonFoundItems: nonFoundItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Regeneration failed');
      }
      
      const data = await response.json();
      
      if (data.success && data.updatedResults) {
        // Update results with regenerated items
        const updatedResults = results.results.map((item: any) => {
          const updatedItem = data.updatedResults.find((updated: any) => updated.item_id === item.item_id);
          return updatedItem || item;
        });
        
        // Recalculate summary
        const newSummary = {
          found_items: updatedResults.filter((r: any) => r.status === 'FOUND').length,
          clarification_items: updatedResults.filter((r: any) => r.status === 'NEEDS_CLARIFICATION').length,
          missing_items: updatedResults.filter((r: any) => r.status === 'MISSING').length,
          overall_score: Math.round(updatedResults.reduce((sum: number, r: any) => sum + r.coverage_score, 0) / updatedResults.length)
        };
        
        // Update results state
        setResults({
          ...results,
          results: updatedResults,
          summary: newSummary
        });
        
        const improved = data.updatedResults.filter((item: any) => item.status === 'FOUND').length;
        showToast(`Regeneration completed! ${improved} items improved to FOUND status.`, 'success');
      } else {
        showToast(data.message || 'Regeneration completed but no improvements found', 'info');
      }
      
    } catch (error: any) {
      console.error('Regenerate error:', error);
      showToast('Regeneration failed: ' + error.message, 'error');
    } finally {
      setRegenerating(false);
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
          mode: analysisMode,
          whitepaperSection: templates.find(t => t.id === selectedTemplate)?.name?.includes('Whitepaper') ? whitepaperSections.join('+') : undefined
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
          templateId: selectedTemplate,
          whitepaperSection: templates.find(t => t.id === selectedTemplate)?.name?.includes('Whitepaper') ? whitepaperSections.join('+') : undefined
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

  const WhitepaperSectionSelector = () => (
    <div>
      <label className="block text-sm font-medium mb-2 text-white">
        Whitepaper Sections (Select Multiple)
      </label>
      <div className="space-y-2">
        {['A', 'B', 'C'].map(section => (
          <label key={section} className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={whitepaperSections.includes(section)}
              onChange={(e) => {
                if (e.target.checked) {
                  setWhitepaperSections([...whitepaperSections, section]);
                } else {
                  setWhitepaperSections(whitepaperSections.filter(s => s !== section));
                }
              }}
              className="rounded border-gray-600 bg-gray-800 text-primary focus:ring-primary"
            />
            <span className="text-white">
              {section === 'A' ? '📋 Part A: Offeror Information' :
               section === 'B' ? '🏢 Part B: Issuer Information' :
               '🏛️ Part C: Trading Platform Operator'}
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-text-secondary mt-2">
        💡 Select A, A+B, A+C, or A+B+C. Other sections (D-I) are always included.
      </p>
    </div>
  );

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

                {templates.find(t => t.id === selectedTemplate)?.name?.includes('Whitepaper') && (
                  <WhitepaperSectionSelector />
                )}

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

                {templates.find(t => t.id === selectedTemplate)?.name?.includes('Whitepaper') && (
                  <WhitepaperSectionSelector />
                )}

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

                {templates.find(t => t.id === selectedTemplate)?.name?.includes('Whitepaper') && (
                  <WhitepaperSectionSelector />
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Analysis Mode
                  </label>
                  <select
                    value={analysisMode}
                    onChange={(e) => setAnalysisMode(e.target.value as 'fast' | 'normal')}
                    className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                  >
                    <option value="fast">🚀 Fast Mode - Single call for all items (GPT-4o-mini)</option>
                    <option value="normal">🎯 Normal Mode - 1 call per item (GPT-4, more accurate)</option>
                  </select>
                  <p className="text-xs text-text-secondary mt-1">
                    💡 Fast mode is cheaper and faster. Normal mode is more accurate but takes longer.
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
              <div>Saved analyses content...</div>
            )}
          </div>
        </div>

        <ToastContainer />
      </div>
    </Layout>
  );
}