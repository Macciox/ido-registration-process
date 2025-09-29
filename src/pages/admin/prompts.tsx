import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

interface Prompt {
  id: string;
  name: string;
  content: string;
  description: string;
  variables: string[];
}

export default function PromptsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.user_metadata?.role !== 'admin') {
        router.push('/dashboard');
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
      const response = await fetch('/api/admin/prompts');
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      showToast('Failed to fetch prompts', 'error');
    }
  };

  const savePrompt = async () => {
    if (!editingPrompt) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/update-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPrompt.id,
          content: editingPrompt.content,
          description: editingPrompt.description
        })
      });

      if (response.ok) {
        showToast('Prompt updated successfully', 'success');
        fetchPrompts();
        setEditingPrompt(null);
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      showToast('Failed to update prompt', 'error');
    } finally {
      setSaving(false);
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
            <h1 className="text-2xl font-bold text-white">Prompt Management</h1>
            <p className="text-text-secondary">Manage AI prompts for compliance analysis</p>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="btn-secondary"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="sleek-card">
            <div className="p-6">
              <h2 className="text-lg font-bold text-white mb-4">Prompts</h2>
              <div className="space-y-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => setSelectedPrompt(prompt)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedPrompt?.id === prompt.id
                        ? 'bg-primary text-white'
                        : 'bg-card-secondary text-text-secondary hover:bg-primary/20'
                    }`}
                  >
                    <div className="font-medium">{prompt.name}</div>
                    <div className="text-sm opacity-75">
                      {prompt.variables?.length || 0} variables
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 sleek-card">
            <div className="p-6">
              {selectedPrompt ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">{selectedPrompt.name}</h2>
                      <p className="text-text-secondary">{selectedPrompt.description}</p>
                    </div>
                    <button
                      onClick={() => setEditingPrompt({...selectedPrompt})}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      Edit Prompt
                    </button>
                  </div>

                  {selectedPrompt.variables?.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-white font-medium mb-2">Variables:</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedPrompt.variables.map((variable) => (
                          <span
                            key={variable}
                            className="px-2 py-1 bg-primary/20 text-primary rounded text-sm"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-card-secondary rounded-lg p-4">
                    <h3 className="text-white font-medium mb-2">Prompt Content:</h3>
                    <pre className="text-text-secondary text-sm whitespace-pre-wrap">
                      {selectedPrompt.content}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-text-secondary">Select a prompt to view details</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {editingPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-4">Edit Prompt: {editingPrompt.name}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Description</label>
                  <input
                    type="text"
                    value={editingPrompt.description}
                    onChange={(e) => setEditingPrompt({...editingPrompt, description: e.target.value})}
                    className="w-full p-3 border border-border rounded-lg bg-card-secondary text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Prompt Content</label>
                  <textarea
                    value={editingPrompt.content}
                    onChange={(e) => setEditingPrompt({...editingPrompt, content: e.target.value})}
                    className="w-full p-3 border border-border rounded-lg bg-card-secondary text-white font-mono text-sm"
                    rows={20}
                  />
                </div>

                {editingPrompt.variables?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">Available Variables:</label>
                    <div className="flex flex-wrap gap-2">
                      {editingPrompt.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-1 bg-primary/20 text-primary rounded text-sm cursor-pointer"
                          onClick={() => {
                            const textarea = document.querySelector('textarea');
                            if (textarea) {
                              const cursorPos = textarea.selectionStart;
                              const textBefore = editingPrompt.content.substring(0, cursorPos);
                              const textAfter = editingPrompt.content.substring(cursorPos);
                              setEditingPrompt({
                                ...editingPrompt,
                                content: textBefore + `{{${variable}}}` + textAfter
                              });
                            }
                          }}
                        >
                          {variable} (click to insert)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={savePrompt}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingPrompt(null)}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50"
                >
                  Cancel
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