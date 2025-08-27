import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  is_active: boolean;
  checker_items: Array<{
    id: string;
    category: string;
    item_name: string;
    description: string;
    weight: number;
    sort_order: number;
    scoring_logic?: string;
    field_type?: string;
  }>;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddItem, setShowAddItem] = useState(false);

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

  const updateItem = async (itemId: string, updates: any) => {
    try {
      const response = await fetch('/api/compliance/update-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, updates })
      });
      
      if (response.ok) {
        fetchTemplates();
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const addItem = async (templateId: string, newItem: any) => {
    try {
      const response = await fetch('/api/compliance/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, ...newItem })
      });
      
      if (response.ok) {
        fetchTemplates();
        setShowAddItem(false);
      }
    } catch (error) {
      console.error('Error adding item:', error);
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
            <h1 className="text-2xl font-bold text-white">Compliance Templates</h1>
            <p className="text-text-secondary">Manage MiCA compliance templates and checklist items</p>
          </div>
          <button 
            onClick={() => router.push('/admin/tools')}
            className="btn-secondary"
          >
            ← Back to Tools
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="sleek-card p-6">
            <h2 className="text-lg font-medium text-white mb-4">Templates</h2>
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-card-secondary hover:bg-card-secondary/80'
                  }`}
                >
                  <div className="font-medium text-white">{template.name}</div>
                  <div className="text-sm text-text-secondary">{template.type}</div>
                  <div className="text-xs text-text-secondary mt-1">
                    {template.checker_items?.length || 0} items
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Template Items */}
          {selectedTemplate && (
            <div className="lg:col-span-2 sleek-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-white">{selectedTemplate.name}</h2>
                  <p className="text-sm text-text-secondary">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => setShowAddItem(true)}
                  className="btn-primary text-sm"
                >
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {(() => {
                  // Group items by category
                  const groupedItems = selectedTemplate.checker_items?.reduce((acc: any, item) => {
                    if (!acc[item.category]) acc[item.category] = [];
                    acc[item.category].push(item);
                    return acc;
                  }, {}) || {};

                  return Object.entries(groupedItems).map(([category, items]: [string, any]) => (
                    <div key={category} className="mb-6">
                      <h3 className="text-lg font-medium text-white mb-3 pb-2 border-b border-border">
                        {category}
                      </h3>
                      <div className="space-y-3">
                        {items.map((item: any, index: number) => (
                  <div key={item.id} className="bg-card-secondary p-4 rounded-lg border-l-4 border-blue-500/30">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                    {editingItem?.id === item.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingItem.item_name}
                          onChange={(e) => setEditingItem({...editingItem, item_name: e.target.value})}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                          placeholder="Item name"
                        />
                        <input
                          type="text"
                          value={editingItem.category}
                          onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                          placeholder="Category"
                        />
                        <textarea
                          value={editingItem.description}
                          onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white h-20"
                          placeholder="Description"
                        />
                        <div className="flex gap-4">
                          <div className="flex gap-2">
                            <label className="text-white text-sm">Weight:</label>
                            <input
                              type="number"
                              step="0.1"
                              value={editingItem.weight}
                              onChange={(e) => setEditingItem({...editingItem, weight: parseFloat(e.target.value)})}
                              className="w-20 p-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          value={editingItem.field_type || ''}
                          onChange={(e) => setEditingItem({...editingItem, field_type: e.target.value})}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                          placeholder="Field Type (e.g., Yes/No, Dropdown, Text field)"
                        />
                        <textarea
                          value={editingItem.scoring_logic || ''}
                          onChange={(e) => setEditingItem({...editingItem, scoring_logic: e.target.value})}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white h-16 text-sm"
                          placeholder="Scoring Logic (e.g., Yes = 1000, No = 0)"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateItem(item.id, editingItem)}
                            className="btn-primary text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-white">{item.item_name}</h3>
                          <button
                            onClick={() => setEditingItem(item)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="text-sm text-text-secondary mb-1">
                          Category: {item.category}
                        </div>
                        <div className="text-sm text-text-secondary mb-1">
                          {item.description}
                        </div>
                        <div className="text-xs text-blue-400">
                          Weight: {item.weight}
                        </div>
                        {item.field_type && (
                          <div className="text-xs text-purple-400 mt-1">
                            Type: {item.field_type}
                          </div>
                        )}
                        {item.scoring_logic && (
                          <div className="text-xs text-green-400 mt-1">
                            Scoring: {item.scoring_logic}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                    </div>
                  </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Add Item Form */}
              {showAddItem && (
                <div className="mt-4 p-4 bg-card-secondary rounded-lg border border-border">
                  <h3 className="text-white font-medium mb-3">Add New Item</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    addItem(selectedTemplate.id, {
                      item_name: formData.get('item_name'),
                      category: formData.get('category'),
                      description: formData.get('description'),
                      weight: parseFloat(formData.get('weight') as string) || 1.0,
                      field_type: formData.get('field_type'),
                      scoring_logic: formData.get('scoring_logic'),
                      sort_order: selectedTemplate.checker_items?.length || 0
                    });
                  }}>
                    <div className="space-y-3">
                      <input
                        name="item_name"
                        type="text"
                        placeholder="Item name"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        required
                      />
                      <input
                        name="category"
                        type="text"
                        placeholder="Category"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        required
                      />
                      <textarea
                        name="description"
                        placeholder="Description"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white h-20"
                        required
                      />
                      <input
                        name="weight"
                        type="number"
                        step="0.1"
                        placeholder="Weight (default: 1.0)"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                      />
                      <input
                        name="field_type"
                        type="text"
                        placeholder="Field Type (e.g., Yes/No, Dropdown, Text field)"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                      />
                      <textarea
                        name="scoring_logic"
                        placeholder="Scoring Logic (e.g., Yes = 1000, No = 0)"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white h-16 text-sm"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-sm">
                          Add Item
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddItem(false)}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}