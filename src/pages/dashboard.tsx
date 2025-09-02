import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';

interface Analysis {
  document_id: string;
  filename: string;
  doc_hash: string;
  document_url: string;
  document_created_at: string;
  check_id: string;
  version: number;
  overall_score: number;
  found_items: number;
  clarification_items: number;
  missing_items: number;
  status: string;
  analysis_created_at: string;
  template_name: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
      fetchAnalyses();
    };
    init();
  }, [router]);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/analyses');
      const data = await response.json();
      if (data.success) {
        setAnalyses(data.analyses);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    }
  };

  const handleReanalyze = (analysis: Analysis) => {
    setSelectedAnalysis(analysis);
    setShowModal(true);
  };

  const performReanalysis = async (overwrite: boolean) => {
    if (!selectedAnalysis) return;
    
    setReanalyzing(true);
    try {
      // First, trigger a new analysis
      const analyzeResponse = await fetch('/api/compliance/analyze-nosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedAnalysis.document_id,
          templateId: 'default-template-id' // You might want to store this
        })
      });

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed');
      }

      const analysisData = await analyzeResponse.json();

      // Then save the results
      const saveResponse = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: selectedAnalysis.document_id,
          docHash: selectedAnalysis.doc_hash,
          docName: selectedAnalysis.filename,
          templateId: 'default-template-id',
          analysisResults: analysisData,
          overwrite: overwrite
        })
      });

      const saveData = await saveResponse.json();
      
      if (saveData.success) {
        alert(saveData.message);
        fetchAnalyses(); // Refresh the list
      } else {
        throw new Error(saveData.error);
      }

    } catch (error: any) {
      alert('Reanalysis failed: ' + error.message);
    } finally {
      setReanalyzing(false);
      setShowModal(false);
      setSelectedAnalysis(null);
    }
  };

  const downloadDocument = (documentUrl: string, filename: string) => {
    if (documentUrl) {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = filename;
      link.click();
    } else {
      alert('Document URL not available');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Analysis Dashboard</h1>
            <p className="text-text-secondary">Manage and review document analyses</p>
          </div>
          <button 
            onClick={() => router.push('/admin/compliance')}
            className="btn-primary"
          >
            New Analysis
          </button>
        </div>

        <div className="sleek-card">
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-white font-medium">Document</th>
                    <th className="text-left py-3 px-4 text-white font-medium">Hash</th>
                    <th className="text-left py-3 px-4 text-white font-medium">Score</th>
                    <th className="text-left py-3 px-4 text-white font-medium">Version</th>
                    <th className="text-left py-3 px-4 text-white font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-white font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((analysis) => (
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
                            onClick={() => handleReanalyze(analysis)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                          >
                            Re-analyze
                          </button>
                          {analysis.document_url && (
                            <button
                              onClick={() => downloadDocument(analysis.document_url, analysis.filename)}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                            >
                              Download
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {analyses.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-text-secondary">No analyses found</div>
                  <p className="text-sm text-text-secondary mt-2">
                    Start by analyzing a document in the compliance checker
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reanalysis Modal */}
        {showModal && selectedAnalysis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-white mb-4">Re-analyze Document</h3>
              <p className="text-text-secondary mb-6">
                How would you like to handle the new analysis for "{selectedAnalysis.filename}"?
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => performReanalysis(true)}
                  disabled={reanalyzing}
                  className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {reanalyzing ? 'Processing...' : 'Overwrite Current Analysis'}
                </button>
                
                <button
                  onClick={() => performReanalysis(false)}
                  disabled={reanalyzing}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {reanalyzing ? 'Processing...' : 'Create New Version'}
                </button>
                
                <button
                  onClick={() => setShowModal(false)}
                  disabled={reanalyzing}
                  className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}