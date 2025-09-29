import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

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

export default function TemplatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
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
      showToast('Failed to fetch templates', 'error');
    }
  };

  const updateItem = async (itemId: string, updates: any) => {
    try {
      const response = await fetch('/api/admin/update-template-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, updates })
      });

      if (response.ok) {
        showToast('Item updated successfully', 'success');
        fetchTemplates();
        if (selectedTemplate) {
          const updatedTemplate = templates.find(t => t.id === selectedTemplate.id);
          if (updatedTemplate) setSelectedTemplate(updatedTemplate);
        }
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      showToast('Failed to update item', 'error');
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
            <h1 className="text-2xl font-bold text-white">Template Management</h1>
            <p className="text-text-secondary">Manage compliance templates and items</p>
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
              <h2 className="text-lg font-bold text-white mb-4">Templates</h2>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-primary text-white'
                        : 'bg-card-secondary text-text-secondary hover:bg-primary/20'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm opacity-75">
                      {template.checker_items?.length || 0} items • {template.type}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 sleek-card">
            <div className="p-6">
              {selectedTemplate ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">{selectedTemplate.name}</h2>
                      <p className="text-text-secondary">{selectedTemplate.description}</p>
                    </div>
                    <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                      {selectedTemplate.type}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-white font-medium">Item</th>
                          <th className="text-left py-3 px-4 text-white font-medium">Category</th>
                          <th className="text-left py-3 px-4 text-white font-medium">Weight</th>
                          <th className="text-left py-3 px-4 text-white font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTemplate.checker_items?.map((item) => (
                          <tr key={item.id} className="border-b border-border/50">
                            <td className="py-3 px-4">
                              <div className="text-white font-medium">{item.item_name}</div>
                              <div className="text-sm text-text-secondary">{item.description}</div>
                            </td>
                            <td className="py-3 px-4 text-text-secondary">{item.category}</td>
                            <td className="py-3 px-4 text-white">{item.weight}</td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-text-secondary">Select a template to view details</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-lg font-bold text-white mb-4">Edit Template Item</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Item Name</label>
                  <input
                    type="text"
                    value={editingItem.item_name}
                    onChange={(e) => setEditingItem({...editingItem, item_name: e.target.value})}
                    className="w-full p-3 border border-border rounded-lg bg-card-secondary text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Description</label>
                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                    className="w-full p-3 border border-border rounded-lg bg-card-secondary text-white"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Category</label>
                  <input
                    type="text"
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                    className="w-full p-3 border border-border rounded-lg bg-card-secondary text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">Weight</label>
                  <input
                    type="number"
                    value={editingItem.weight}
                    onChange={(e) => setEditingItem({...editingItem, weight: parseInt(e.target.value)})}
                    className="w-full p-3 border border-border rounded-lg bg-card-secondary text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    updateItem(editingItem.id, {
                      item_name: editingItem.item_name,
                      description: editingItem.description,
                      category: editingItem.category,
                      weight: editingItem.weight
                    });
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
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