import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { COMPLIANCE_PROMPTS } from '@/lib/compliance/prompts';

export default function PromptsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState(COMPLIANCE_PROMPTS);
  const [activeTab, setActiveTab] = useState('WHITEPAPER_ANALYSIS');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    };
    init();
  }, [router]);

  const handlePromptChange = (key: string, value: string) => {
    setPrompts(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const savePrompts = async () => {
    try {
      const response = await fetch('/api/compliance/update-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts),
      });

      if (response.ok) {
        setHasChanges(false);
        alert('Prompts saved successfully!');
      } else {
        throw new Error('Save error');
      }
    } catch (error) {
      alert('Error saving prompts');
    }
  };

  const resetPrompts = () => {
    setPrompts(COMPLIANCE_PROMPTS);
    setHasChanges(false);
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

  const tabs = [
    { key: 'WHITEPAPER_ANALYSIS', label: 'Whitepaper Analysis' },
    { key: 'LEGAL_ANALYSIS', label: 'Legal Analysis' },
    { key: 'SYSTEM_PROMPT', label: 'System Prompt' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Editor Prompt GPT-4</h1>
            <p className="text-text-secondary">Edit prompts used by AI for document analysis</p>
          </div>
          <a href="/admin/tools" className="btn-secondary">
            ← Back to Tools
          </a>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="space-x-4">
            {hasChanges && (
              <span className="text-orange-600 font-medium">Unsaved changes</span>
            )}
            <button
              onClick={resetPrompts}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Reset
            </button>
            <button
              onClick={savePrompts}
              disabled={!hasChanges}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Save Prompts
            </button>
          </div>
        </div>

        <div className="sleek-card">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">
                {tabs.find(t => t.key === activeTab)?.label}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {activeTab === 'WHITEPAPER_ANALYSIS' && 'Prompt for MiCA whitepaper analysis. Use variables: {category}, {item_name}, {description}, {relevant_content}'}
                {activeTab === 'LEGAL_ANALYSIS' && 'Prompt for legal document analysis. Use variables: {category}, {item_name}, {description}, {relevant_content}'}
                {activeTab === 'SYSTEM_PROMPT' && 'System prompt to define general AI behavior'}
              </p>
            </div>

            <textarea
              value={prompts[activeTab as keyof typeof prompts]}
              onChange={(e) => handlePromptChange(activeTab, e.target.value)}
              className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
              placeholder="Enter the prompt..."
            />

            <div className="mt-4 text-sm text-gray-500">
              <p><strong>Available variables:</strong></p>
              <ul className="list-disc list-inside mt-2">
                <li><code>{'{category}'}</code> - Category of the item to verify</li>
                <li><code>{'{item_name}'}</code> - Name of the item to verify</li>
                <li><code>{'{description}'}</code> - Description of the item</li>
                <li><code>{'{relevant_content}'}</code> - Relevant document content</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Important</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Prompts must return valid JSON with fields: status, coverage_score, reasoning, evidence_snippets</li>
            <li>• Status must be: FOUND, NEEDS_CLARIFICATION, or MISSING</li>
            <li>• Coverage_score must be a number from 0 to 100</li>
            <li>• Changes apply immediately to new analyses</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}