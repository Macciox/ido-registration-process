import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import ProjectOwnersList from '@/components/admin/ProjectOwnersList';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

interface Project {
  id: string;
  name: string;
  created_at: string;
}

const ProjectSettings: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      
      if (id) {
        await loadProject(id as string);
      }
    };
    
    init();
  }, [id, router]);

  const loadProject = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      
      setProject(data);
      setNewName(data.name);
    } catch (err: any) {
      console.error('Error loading project:', err);
      setMessage({ text: 'Failed to load project', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateProjectName = async () => {
    if (!project || !newName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: newName.trim() })
        .eq('id', project.id);
      
      if (error) throw error;
      
      setProject({ ...project, name: newName.trim() });
      setEditingName(false);
      setMessage({ text: 'Project name updated successfully', type: 'success' });
    } catch (err: any) {
      setMessage({ text: `Failed to update project name: ${err.message}`, type: 'error' });
    }
  };

  const deleteProject = async () => {
    if (!project || !user || user.role !== 'admin') return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      setDeleting(true);
      
      // Delete project owners first
      await supabase
        .from('project_owners')
        .delete()
        .eq('project_id', project.id);
      
      // Delete project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);
      
      if (error) throw error;
      
      router.push('/admin/dashboard');
    } catch (err: any) {
      setMessage({ text: `Failed to delete project: ${err.message}`, type: 'error' });
      setDeleting(false);
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

  if (!project) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Project not found
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
          <button
            onClick={() => router.back()}
            className="btn btn-secondary"
          >
            ← Back
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Project Name Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Project Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              {editingName ? (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="form-input flex-1"
                  />
                  <button
                    onClick={updateProjectName}
                    className="btn btn-primary"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNewName(project.name);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-gray-900">{project.name}</span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created
              </label>
              <span className="text-gray-900">
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Project Owners Section */}
        <ProjectOwnersList projectId={project.id} />

        {/* Danger Zone - Only for Admins */}
        {user?.role === 'admin' && (
          <div className="bg-white shadow rounded-lg p-6 border-l-4 border-red-500">
            <h2 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h2>
            
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-red-800">Delete Project</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete this project and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={deleteProject}
                  disabled={deleting}
                  className="btn bg-red-600 hover:bg-red-700 text-white ml-4"
                >
                  {deleting ? 'Deleting...' : 'Delete Project'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectSettings;