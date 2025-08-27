import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';

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

export default function CompliancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

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

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedTemplate) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', selectedTemplate);

    try {
      // Step 1: Upload document
      const uploadResponse = await fetch('/api/compliance/upload-final', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const uploadData = await uploadResponse.json();
      console.log('Upload success:', uploadData);
      
      // For now, just show success message
      alert(`Upload successful! Check ID: ${uploadData.checkId}`);
      setFile(null);
      setSelectedTemplate('');
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing document');
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
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">MiCA Compliance Checker</h1>

        {!results ? (
          <div className="bg-white rounded-lg shadow p-6">
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
                {isUploading ? 'Processing...' : 'Analyze Compliance'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <button
                onClick={() => setResults(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                New Analysis
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-800">
                  {results.summary?.found_items || 0}
                </div>
                <div className="text-green-600">Found</div>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-800">
                  {results.summary?.clarification_items || 0}
                </div>
                <div className="text-yellow-600">Needs Clarification</div>
              </div>
              <div className="bg-red-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-800">
                  {results.summary?.missing_items || 0}
                </div>
                <div className="text-red-600">Missing</div>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">
                  {results.summary?.overall_score || 0}%
                </div>
                <div className="text-blue-600">Overall Score</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Detailed Results</h3>
              </div>
              <div className="divide-y">
                {results.results?.map((item: any, index: number) => (
                  <div key={index} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{item.item_name}</h4>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.status === 'FOUND' ? 'bg-green-100 text-green-800' :
                        item.status === 'NEEDS_CLARIFICATION' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    {item.reasoning && (
                      <p className="text-sm text-gray-700 mb-2">{item.reasoning}</p>
                    )}
                    {item.evidences?.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Evidence found on page {item.evidences[0].page}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}