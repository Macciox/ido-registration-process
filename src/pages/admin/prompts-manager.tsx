import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { LoadingButton } from '@/components/ui/LoadingSpinner';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  lastModified: string;
  version: number;
}

export default function PromptsManagerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [editedTemplate, setEditedTemplate] = useState('');
  const [saving, setSaving] = useState(false);
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
      fetchPrompts();
    };
    init();
  }, [router]);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      showToast('Failed to fetch prompts', 'error');
    }
  };

  const handleSelectPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setEditedTemplate(prompt.template);
  };

  const handleSavePrompt = async () => {
    if (!selectedPrompt) return;

    setSaving(true);
    try {
      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPrompt.id,
          template: editedTemplate
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showToast('Prompt updated successfully', 'success');
        fetchPrompts();
        setSelectedPrompt(data.prompt);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      showToast('Failed to save prompt: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    if (selectedPrompt) {
      setEditedTemplate(selectedPrompt.template);
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
            <h1 className="text-2xl font-bold text-white">Prompt Manager</h1>
            <p className="text-text-secondary">Manage and edit AI analysis prompts</p>
          </div>
          <button 
            onClick={() => router.push('/admin/tools')}
            className="btn-secondary"
          >
            ← Back to Tools
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Prompts List */}
          <div className="sleek-card">
            <div className="p-6">
              <h2 className="text-lg font-bold text-white mb-4">Available Prompts</h2>
              <div className="space-y-3">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    onClick={() => handleSelectPrompt(prompt)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedPrompt?.id === prompt.id
                        ? 'bg-primary/20 border border-primary'
                        : 'bg-card-secondary hover:bg-card-secondary/80'
                    }`}
                  >
                    <div className="font-medium text-white">{prompt.name}</div>
                    <div className="text-sm text-text-secondary mt-1">{prompt.description}</div>
                    <div className="text-xs text-text-secondary mt-2">
                      v{prompt.version} • {new Date(prompt.lastModified).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-blue-400 mt-1">
                      Variables: {prompt.variables.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt Editor */}
          <div className="lg:col-span-2 sleek-card">
            <div className="p-6">
              {selectedPrompt ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">{selectedPrompt.name}</h2>
                      <p className="text-text-secondary text-sm">{selectedPrompt.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={resetChanges}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                      >
                        Reset
                      </button>
                      <LoadingButton
                        loading={saving}
                        onClick={handleSavePrompt}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded text-sm transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </LoadingButton>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Prompt Template
                      </label>
                      <textarea
                        value={editedTemplate}
                        onChange={(e) => setEditedTemplate(e.target.value)}
                        className="w-full h-96 p-3 bg-card-secondary border border-border rounded-lg text-white font-mono text-sm resize-none"
                        placeholder="Enter prompt template..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-white font-medium mb-2">Variables Available:</div>
                        <div className="space-y-1">
                          {selectedPrompt.variables.map((variable) => (
                            <div key={variable} className="text-blue-400 font-mono">
                              {`{{${variable}}}`}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-white font-medium mb-2">Prompt Info:</div>
                        <div className="space-y-1 text-text-secondary">
                          <div>Version: {selectedPrompt.version}</div>
                          <div>Last Modified: {new Date(selectedPrompt.lastModified).toLocaleString()}</div>
                          <div>Characters: {editedTemplate.length}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-text-secondary">Select a prompt to edit</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ToastContainer />
      </div>
    </Layout>
  );
}