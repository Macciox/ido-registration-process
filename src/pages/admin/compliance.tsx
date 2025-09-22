import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { LoadingButton, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import ProjectSelector from '@/components/compliance/ProjectSelector';

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
  processing_status?: string;
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
  const [editingItem, setEditingItem] = useState<string>('');
  const [editValues, setEditValues] = useState<{[key: string]: any}>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
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
      
      if (!session?.access_token) {
        console.error('No valid session token, redirecting to login');
        router.push('/login');
        return;
      }
      
      const response = await fetch('/api/compliance/documents', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      console.log('Documents response status:', response.status);
      
      if (response.status === 401) {
        console.error('Token expired, redirecting to login');
        router.push('/login');
        return;
      }
      
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

  const handleFileUpload = async (e: React.FormEvent, analyzeAfterUpload: boolean = true) => {
    e.preventDefault();
    if (!file) return;
    if (analyzeAfterUpload && !selectedTemplate) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', selectedTemplate);
    if (selectedProjectId) {
      formData.append('projectId', selectedProjectId);
    }

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
      
      if (analyzeAfterUpload && selectedTemplate) {
        // Automatically start analysis after upload
        console.log('Starting automatic analysis...');
        const analysisResponse = await fetch('/api/compliance/analyze', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            documentId: uploadData.documentId,
            templateId: selectedTemplate,
            whitepaperSection: templates.find(t => t.id === selectedTemplate)?.name?.includes('Whitepaper') ? whitepaperSections.join('+') : undefined
          })
        });
        
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          console.log('Analysis completed:', analysisData);
          
          setResults({
            ...analysisData,
            documentId: uploadData.documentId,
            templateId: selectedTemplate,
            actualTemplateUsed: selectedTemplate
          });
          setShowResults(true);
          showToast(`Upload & Analysis completed! File: ${uploadData.filename}`, 'success');
        } else {
          const analysisError = await analysisResponse.json();
          console.error('Analysis failed:', analysisError);
          showToast(`Upload successful but analysis failed: ${analysisError.error}`, 'warning');
        }
      } else {
        showToast(`Upload completed! File: ${uploadData.filename}`, 'success');
      }
      
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
          projectId: selectedProjectId,
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
      
      // Check if results are missing required fields
      const firstResult = data.results?.[0];
      if (firstResult && !firstResult.status) {
        console.error('❌ PROBLEM: Results missing status, coverage_score, reasoning!');
        console.error('This means OpenAI parsing failed or timeout occurred');
        console.error('Try using FAST MODE instead of NORMAL MODE');
      }
      
      console.log('Setting results and showResults to true');
      setResults({
        ...data,
        actualTemplateUsed: selectedTemplate
      });
      setShowResults(true);
      console.log('Results set, showResults:', true, 'results count:', data.results?.length);
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
      const response = await fetch('/api/compliance/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          documentId: selectedDocument,
          templateId: selectedTemplate,
          projectId: selectedProjectId,
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

                {/* Whitepaper Section Selector */}
                {templates.find(t => t.id === selectedTemplate)?.name?.includes('Whitepaper') && (
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
                )}

                <ProjectSelector 
                  onProjectSelect={(projectId, projectName) => {
                    setSelectedProjectId(projectId);
                    setSelectedProjectName(projectName || '');
                  }}
                  selectedProjectId={selectedProjectId}
                />

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

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleFileUpload(e, false); // Upload only
                    }}
                    disabled={isUploading || !file}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : '📁 Upload Only'}
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !file || !selectedTemplate}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Processing...' : '🚀 Upload & Analyze'}
                  </button>
                </div>
              </form>
            ) : activeTab === 'existing' ? (
              <form onSubmit={handleAnalyzeExisting} className="space-y-6">
                <ProjectSelector 
                  onProjectSelect={(projectId, projectName) => {
                    setSelectedProjectId(projectId);
                    setSelectedProjectName(projectName || '');
                  }}
                  selectedProjectId={selectedProjectId}
                />

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
                        {doc.processing_status === 'failed' ? ' ❌ Processing Failed' : 
                         doc.processing_status === 'processing' ? ' ⏳ Processing...' : 
                         doc.processing_status === 'completed' ? ' ✅ Ready' : ''}
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

                {/* Whitepaper Section Selector */}
                {templates.find(t => t.id === selectedTemplate)?.name?.includes('Whitepaper') && (
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
                )}

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isUploading || !selectedDocument || !selectedTemplate}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Analyzing...' : 'Analyze Document'}
                  </button>
                  
                  {selectedDocument && (
                    <div className="flex gap-3">
                      {documents.find(d => d.id === selectedDocument)?.processing_status === 'failed' && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              const response = await fetch('/api/compliance/reprocess-document', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session?.access_token}`
                                },
                                body: JSON.stringify({ documentId: selectedDocument })
                              });
                              
                              const data = await response.json();
                              if (data.success) {
                                showToast(`Document reprocessed: ${data.chunksCount} chunks created`, 'success');
                                fetchDocuments();
                              } else {
                                showToast(`Reprocessing failed: ${data.message}`, 'error');
                              }
                            } catch (error: any) {
                              showToast('Reprocessing error: ' + error.message, 'error');
                            }
                          }}
                          className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                        >
                          🔄 Reprocess
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/debug/document-chunks?documentId=${selectedDocument}`);
                            const data = await response.json();
                            
                            const newWindow = window.open('', '_blank');
                            if (newWindow) {
                              const chunksHtml = data.chunks.map((chunk: any, i: number) => 
                                `<div style="border: 1px solid #ccc; margin: 10px 0; padding: 10px;">
                                  <h3>Chunk ${i + 1} (Page ${chunk.page || 'N/A'})</h3>
                                  <pre style="white-space: pre-wrap; font-family: inherit;">${chunk.content}</pre>
                                </div>`
                              ).join('');
                              
                              newWindow.document.write(`
                                <html>
                                  <head><title>Document Chunks - ${data.document?.filename}</title></head>
                                  <body style="font-family: Arial; padding: 20px; line-height: 1.6;">
                                    <h1>Document Chunks</h1>
                                    <p><strong>File:</strong> ${data.document?.filename}</p>
                                    <p><strong>Status:</strong> ${data.document?.processing_status}</p>
                                    <p><strong>Total Chunks:</strong> ${data.totalChunks}</p>
                                    <hr>
                                    ${chunksHtml}
                                  </body>
                                </html>
                              `);
                              newWindow.document.close();
                            }
                          } catch (error) {
                            showToast('Error loading chunks: ' + error, 'error');
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                      >
                        📄 View Chunks
                      </button>
                    </div>
                  )}
                </div>
              </form>
            ) : activeTab === 'url' ? (
              <div className="space-y-6">
                <form onSubmit={handleAnalyzeURL} className="space-y-6">
                  <ProjectSelector 
                    onProjectSelect={(projectId, projectName) => {
                      setSelectedProjectId(projectId);
                      setSelectedProjectName(projectName || '');
                    }}
                    selectedProjectId={selectedProjectId}
                  />

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

                {/* Whitepaper Section Selector */}
                {templates.find(t => t.id === selectedTemplate)?.name?.includes('Whitepaper') && (
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
                                <span className="text-white">
                                  {analysis.template_name?.toLowerCase().includes('legal') ? (
                                    (() => {
                                      // For legal templates, show points collected
                                      const pointsCollected = Math.round((analysis.overall_score / 100) * 6052);
                                      return `${pointsCollected}/6052`;
                                    })()
                                  ) : (
                                    `${analysis.overall_score}%`
                                  )}
                                </span>
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
                                      console.log('🔍 Loading analysis for checkId:', analysis.check_id);
                                      const response = await fetch(`/api/compliance/get-analysis?checkId=${analysis.check_id}`);
                                      
                                      console.log('📡 Response status:', response.status);
                                      
                                      if (!response.ok) {
                                        const errorText = await response.text();
                                        console.error('❌ Response error:', errorText);
                                        throw new Error(`HTTP ${response.status}: ${errorText}`);
                                      }
                                      
                                      const data = await response.json();
                                      console.log('✅ Loaded analysis data:', data);
                                      console.log('📊 Results array length:', data.results?.length);
                                      console.log('🎯 Template name:', data.templateName);
                                      console.log('📋 First result:', data.results?.[0]);
                                      
                                      if (!data.results || data.results.length === 0) {
                                        throw new Error('No results found in analysis');
                                      }
                                      
                                      setResults(data);
                                      setShowResults(true);
                                      console.log('🎉 Results set and modal should show');
                                    } catch (error: any) {
                                      console.error('💥 Error loading analysis:', error);
                                      showToast('Error loading analysis: ' + error.message, 'error');
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
                      <span className="ml-2 text-xs text-gray-500">Debug: {JSON.stringify({templateName: results.templateName, isLegal: results.templateName?.toLowerCase().includes('legal')})}</span>
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
                <div className="bg-gray-500/20 border border-gray-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-400">
                    {results.summary?.not_applicable_items || 0}
                  </div>
                  <div className="text-gray-300 text-sm">Not Applicable</div>
                </div>
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {results.templateName?.toLowerCase().includes('legal') ? (
                      (() => {
                        // For legal templates, calculate points collected
                        const allItems = results.results || [];
                        const scoredItems = allItems.filter((r: any) => r.coverage_score !== 'Not scored');
                        const totalRiskScore = scoredItems.reduce((sum: number, r: any) => 
                          sum + (typeof r.coverage_score === 'number' ? r.coverage_score : 0), 0
                        );
                        
                        // Calculate max possible score for scored items only
                        let maxForScoredItems = 0;
                        scoredItems.forEach((item: any) => {
                          const scoring = item.scoring_logic || '';
                          const numbers = scoring.match(/\d+/g);
                          if (numbers) {
                            maxForScoredItems += Math.max(...numbers.map((n: string) => parseInt(n)));
                          }
                        });
                        
                        // Debug each item's contribution
                        console.log('=== SCORING DEBUG ===');
                        scoredItems.forEach((item: any, i: number) => {
                          const scoring = item.scoring_logic || '';
                          const numbers = scoring.match(/\d+/g);
                          const maxForItem = numbers ? Math.max(...numbers.map((n: string) => parseInt(n))) : 0;
                          console.log(`Item ${i+1}: ${item.item_name}`);
                          console.log(`  Scoring: ${scoring}`);
                          console.log(`  Max: ${maxForItem}, Current Risk: ${item.coverage_score}`);
                        });
                        
                        // Show risk score and risk percentage
                        console.log('Final calc:', { maxForScoredItems, totalRiskScore, scoredItemsCount: scoredItems.length });
                        const riskPercentage = maxForScoredItems > 0 ? Math.round((totalRiskScore / maxForScoredItems) * 100) : 0;
                        return `${totalRiskScore}/${maxForScoredItems} (${riskPercentage}%)`;
                      })()
                    ) : (
                      `${results.summary?.overall_score || 0}%`
                    )}
                  </div>
                  <div className="text-blue-300 text-sm">
                    {results.templateName?.toLowerCase().includes('legal') ? 'Risk Score (Lower = Better)' : 'Overall Score'}
                  </div>
                </div>
              </div>
              
              {results.summary?.not_applicable_items > 0 && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-300">
                    📊 Score calculated on {results.summary?.applicable_items || (results.summary?.found_items + results.summary?.clarification_items + results.summary?.missing_items)} applicable items 
                    ({results.summary?.not_applicable_items} items marked as Not Applicable)
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div>
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-3 text-white font-medium w-1/5 text-sm">Item</th>
                      <th className="text-left py-3 px-3 text-white font-medium w-1/8 text-sm">Category</th>
                      {results.templateName?.toLowerCase().includes('legal') ? (
                        <>
                          <th className="text-left py-3 px-3 text-white font-medium w-1/12 text-sm">Risk Score</th>
                          <th className="text-left py-3 px-3 text-white font-medium w-1/8 text-sm">Selected Answer</th>
                          <th className="text-left py-3 px-3 text-white font-medium w-1/3 text-sm">Reasoning & Actions</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-4 px-6 text-white font-medium w-1/8">Status</th>
                          <th className="text-left py-4 px-6 text-white font-medium w-1/6">Manual Override</th>
                          <th className="text-left py-4 px-6 text-white font-medium w-1/12">Score</th>
                        </>
                      )}
                      <th className="text-left py-3 px-3 text-white font-medium w-1/8 text-sm">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results?.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-3 px-3 text-white text-sm">{item.item_name}</td>
                        <td className="py-3 px-3 text-text-secondary text-xs">{item.category}</td>
                        {results.templateName?.toLowerCase().includes('legal') ? (
                          <>
                            <td className="py-3 px-3">
                              {editingItem === item.item_id ? (
                                <input
                                  type="text"
                                  value={editValues[item.item_id]?.coverage_score || item.coverage_score}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    
                                    // Extract valid values from scoring logic
                                    const scoring = item.scoring_logic || '';
                                    const numbers = scoring.match(/\d+/g);
                                    const validValues = numbers ? numbers.map((n: string) => parseInt(n)) : [];
                                    validValues.push('Not scored'); // Always allow "Not scored"
                                    
                                    // Check if value is valid
                                    const isValid = validValues.includes(parseInt(newValue)) || newValue === 'Not scored' || newValue === '';
                                    
                                    if (isValid || newValue === '') {
                                      setEditValues({
                                        ...editValues,
                                        [item.item_id]: {
                                          ...editValues[item.item_id],
                                          coverage_score: newValue
                                        }
                                      });
                                    }
                                  }}
                                  className={`w-16 px-1 py-1 rounded text-white text-xs ${
                                    (() => {
                                      const scoring = item.scoring_logic || '';
                                      const numbers = scoring.match(/\d+/g);
                                      const validValues = numbers ? numbers.map((n: string) => parseInt(n)) : [];
                                      validValues.push('Not scored');
                                      const currentValue = editValues[item.item_id]?.coverage_score;
                                      const isValid = validValues.includes(parseInt(currentValue)) || currentValue === 'Not scored' || currentValue === '';
                                      return isValid ? 'bg-gray-800 border border-gray-600' : 'bg-red-800 border border-red-500';
                                    })()
                                  }`}
                                  title={`Valid values: ${(() => {
                                    const scoring = item.scoring_logic || '';
                                    const numbers = scoring.match(/\d+/g);
                                    return numbers ? numbers.join(', ') + ', Not scored' : 'Not scored';
                                  })()}`}
                                />
                              ) : (
                                <span className={`font-medium px-1 py-1 rounded text-xs ${
                                  item.coverage_score === 'Not scored' ? 'bg-gray-500/20 text-gray-400' :
                                  item.coverage_score >= 1000 ? 'bg-red-500/20 text-red-400' :
                                  (item.coverage_score === 3 || item.coverage_score === 5) ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {item.coverage_score}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {editingItem === item.item_id ? (
                                <input
                                  type="text"
                                  value={editValues[item.item_id]?.selected_answer || item.selected_answer || ''}
                                  onChange={(e) => setEditValues({
                                    ...editValues,
                                    [item.item_id]: {
                                      ...editValues[item.item_id],
                                      selected_answer: e.target.value
                                    }
                                  })}
                                  className="w-full px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
                                  placeholder="Selected answer"
                                />
                              ) : (
                                <div className="text-xs text-text-secondary space-y-1">
                                  <div className="font-medium text-white text-xs">{item.selected_answer || 'N/A'}</div>
                                  <div className="text-xs">{item.scoring_logic || 'N/A'}</div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {editingItem === item.item_id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editValues[item.item_id]?.reasoning || item.reasoning || ''}
                                    onChange={(e) => setEditValues({
                                      ...editValues,
                                      [item.item_id]: {
                                        ...editValues[item.item_id],
                                        reasoning: e.target.value
                                      }
                                    })}
                                    className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
                                    rows={3}
                                    placeholder="Reasoning"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => {
                                        // Save changes
                                        const updatedResults = results.results.map((r: any) => 
                                          r.item_id === item.item_id ? {
                                            ...r,
                                            coverage_score: editValues[item.item_id]?.coverage_score || r.coverage_score,
                                            selected_answer: editValues[item.item_id]?.selected_answer || r.selected_answer,
                                            reasoning: editValues[item.item_id]?.reasoning || r.reasoning
                                          } : r
                                        );
                                        setResults({ ...results, results: updatedResults });
                                        setEditingItem('');
                                        setEditValues({});
                                      }}
                                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingItem('');
                                        setEditValues({});
                                      }}
                                      className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => {
                                      setEvidenceData({
                                        title: `Reasoning: ${item.item_name}`,
                                        evidence: [{ snippet: item.reasoning || 'No reasoning provided' }]
                                      });
                                      setShowEvidenceModal(true);
                                    }}
                                    className="text-blue-400 hover:text-blue-300 text-xs underline cursor-pointer text-left flex-1 leading-relaxed break-words"
                                  >
                                    {(item.reasoning || 'N/A').substring(0, 80)}{(item.reasoning || '').length > 80 ? '...' : ''}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingItem(item.item_id);
                                      setEditValues({
                                        [item.item_id]: {
                                          coverage_score: item.coverage_score,
                                          selected_answer: item.selected_answer || '',
                                          reasoning: item.reasoning || ''
                                        }
                                      });
                                    }}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  item.status === 'FOUND' ? 'bg-green-500/20 text-green-400' :
                                  item.status === 'NEEDS_CLARIFICATION' ? 'bg-yellow-500/20 text-yellow-400' :
                                  item.status === 'NOT_APPLICABLE' ? 'bg-gray-500/20 text-gray-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {item.status === 'FOUND' ? '✅' : 
                                   item.status === 'NEEDS_CLARIFICATION' ? '⚠️' : 
                                   item.status === 'NOT_APPLICABLE' ? '➖' : '❌'}
                                  {item.status}
                                </span>
                                {item.manually_overridden && (
                                  <span className="text-xs text-orange-400" title="Manually overridden">🔧</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={item.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    const response = await fetch('/api/compliance/update-status', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        resultId: item.result_id,
                                        newStatus: newStatus
                                      })
                                    });
                                    
                                    if (response.ok) {
                                      // Update local state
                                      const updatedResults = results.results.map((r: any, i: number) => 
                                        i === index ? { ...r, status: newStatus, manually_overridden: true } : r
                                      );
                                      
                                      // Recalculate summary
                                      const newSummary = {
                                        found_items: updatedResults.filter((r: any) => r.status === 'FOUND').length,
                                        clarification_items: updatedResults.filter((r: any) => r.status === 'NEEDS_CLARIFICATION').length,
                                        missing_items: updatedResults.filter((r: any) => r.status === 'MISSING').length,
                                        not_applicable_items: updatedResults.filter((r: any) => r.status === 'NOT_APPLICABLE').length,
                                        applicable_items: updatedResults.filter((r: any) => r.status !== 'NOT_APPLICABLE').length,
                                        overall_score: Math.round(
                                          updatedResults.filter((r: any) => r.status !== 'NOT_APPLICABLE').length > 0 ?
                                          (updatedResults.filter((r: any) => r.status === 'FOUND').length / 
                                           updatedResults.filter((r: any) => r.status !== 'NOT_APPLICABLE').length) * 100 : 0
                                        )
                                      };
                                      
                                      setResults({ ...results, results: updatedResults, summary: newSummary });
                                      showToast('Status updated successfully', 'success');
                                    } else {
                                      showToast('Failed to update status', 'error');
                                    }
                                  } catch (error) {
                                    showToast('Error updating status', 'error');
                                  }
                                }}
                                className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-white"
                                style={{ color: 'white' }}
                              >
                                <option value="FOUND" className="bg-gray-800 text-white">✅ Found</option>
                                <option value="NEEDS_CLARIFICATION" className="bg-gray-800 text-white">⚠️ Clarification</option>
                                <option value="MISSING" className="bg-gray-800 text-white">❌ Missing</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-white">{item.coverage_score}%</td>
                          </>
                        )}
                        <td className="py-3 px-3">
                          {item.evidence?.length > 0 ? (
                            <button 
                              onClick={() => {
                                setEvidenceData({
                                  title: item.item_name,
                                  evidence: item.evidence
                                });
                                setShowEvidenceModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 text-xs underline cursor-pointer"
                            >
                              View ({item.evidence.length})
                            </button>
                          ) : (
                            <span className="text-text-secondary text-xs">No evidence</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Analyzed Text Section (for both URL and document analysis) */}
              {results.documentId && (
                <div className="mt-8">
                  <div className="border-t border-border pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">
                        {results.processing ? '📄 Analyzed Website Content' : '📄 Analyzed Document Content'}
                      </h3>
                      {results.processing && (
                        <div className="text-sm text-text-secondary">
                          {results.processing.pagesCount || 1} pages • {results.processing.chunksCount} sections • {results.processing.totalWords} words
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-card-secondary rounded-lg p-4 max-h-96 overflow-y-auto">
                      {results.processing && (
                        <div className="text-sm text-text-secondary mb-2">
                          Source: <a href={results.processing?.url || '#'} target="_blank" className="text-primary hover:underline">
                            {results.processing?.title || 'Website Analysis'}
                          </a>
                        </div>
                      )}
                      
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/debug/chunks?documentId=${results.documentId}`);
                            const data = await response.json();
                            
                            const fullText = data.chunks.map((chunk: any) => chunk.content || chunk.fullContent).join('\n\n');
                            
                            const newWindow = window.open('', '_blank');
                            if (newWindow) {
                              const title = results.processing?.title || documents.find(d => d.id === results.documentId)?.filename || 'Document Analysis';
                              newWindow.document.write(`
                                <html>
                                  <head><title>Analyzed Content - ${title}</title></head>
                                  <body style="font-family: Arial; padding: 20px; line-height: 1.6;">
                                    <h1>${results.processing ? 'Analyzed Website Content' : 'Analyzed Document Content'}</h1>
                                    <p><strong>Source:</strong> ${title}</p>
                                    ${results.processing ? `<p><strong>Pages:</strong> ${results.processing?.pagesCount || 1} pages crawled</p>` : ''}
                                    <p><strong>Chunks:</strong> ${data.totalChunks || data.chunks?.length || 0} sections</p>
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
                <LoadingButton
                  loading={regenerating}
                  onClick={() => handleRegenerate()}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {regenerating ? 'Regenerating...' : '🔄 Regenerate Non-FOUND'}
                </LoadingButton>
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
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border-2 border-gray-600" style={{backgroundColor: '#111827', borderColor: '#4b5563'}}>
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
            <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto border-2 border-gray-600" style={{backgroundColor: '#111827', borderColor: '#4b5563'}}>
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

        {/* Evidence Modal */}
        {showEvidenceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden border-2 border-gray-600" style={{backgroundColor: '#111827', borderColor: '#4b5563'}}>
              <div className="flex justify-between items-center p-6 border-b border-border">
                <h3 className="text-lg font-bold text-white">📋 Evidence for: {evidenceData.title}</h3>
                <button
                  onClick={() => setShowEvidenceModal(false)}
                  className="text-white/60 hover:text-white text-xl p-1"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {evidenceData.evidence.length > 0 ? (
                  <div className="space-y-4">
                    {evidenceData.evidence.map((evidence: any, index: number) => (
                      <div key={index} className="bg-gray-800 rounded-lg p-4 border-2 border-gray-600" style={{backgroundColor: '#1f2937', borderColor: '#4b5563'}}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="bg-primary text-white px-2 py-1 rounded text-sm font-medium">
                            Evidence {index + 1}
                          </span>
                        </div>
                        <div className="text-white leading-relaxed whitespace-pre-wrap">
                          {evidence.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-secondary">
                    No evidence found for this item.
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-border">
                <button
                  onClick={() => setShowEvidenceModal(false)}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    </Layout>
  );
}