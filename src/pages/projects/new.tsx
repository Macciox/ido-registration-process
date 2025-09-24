import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

const NewProject: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          owner_email: user.email
        })
        .select()
        .single();

      if (error) throw error;

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-primary hover:text-primary/80 mb-4 transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-white">Create New Project</h1>
            <p className="text-text-secondary mt-2">
              Create a project to organize your compliance analyses
            </p>
          </div>

          <div className="sleek-card p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="alert alert-error">
                  <div className="alert-icon">⚠</div>
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-text-muted focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>



              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NewProject;