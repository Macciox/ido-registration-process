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
    console.log('Delete project called', { project, user });
    
    if (!project || !user || user.role !== 'admin') {
      console.log('Delete blocked - missing requirements');
      return;
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) {
      console.log('Delete cancelled by user');
      return;
    }
    
    try {
      console.log('Starting delete process...');
      setDeleting(true);
      
      // Delete project owners from whitelist first
      console.log('Deleting project owners...');
      const { error: ownersError } = await supabase
        .from('projectowner_whitelist')
        .delete()
        .eq('project_id', project.id);
      
      if (ownersError) {
        console.error('Error deleting project owners from whitelist:', ownersError);
        // Continue anyway, might not exist
      } else {
        console.log('Project owners deleted successfully');
      }
      
      // Delete project
      console.log('Deleting project...');
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);
      
      if (error) {
        console.error('Project delete error:', error);
        throw error;
      }
      
      console.log('Project deleted successfully, redirecting...');
      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Delete project error:', err);
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
          <h1 className="text-2xl font-bold text-white">Project Settings</h1>
          <button
            onClick={() => router.back()}
            className="btn-light"
          >
            ← Back
          </button>
        </div>

        {message && (
          <div className={`alert ${
            message.type === 'success' ? 'alert-success' : 'alert-error'
          }`}>
            <div className="alert-icon">{message.type === 'success' ? '✓' : '⚠'}</div>
            <p>
            {message.text}
            </p>
          </div>
        )}

        {/* Project Name Section */}
        <div className="sleek-card p-6">
          <h2 className="text-lg font-medium text-white mb-4">Project Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Project Name
              </label>
              {editingName ? (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="sleek-input flex-1"
                  />
                  <button
                    onClick={updateProjectName}
                    className="btn-dark"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNewName(project.name);
                    }}
                    className="btn-light"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-white">{project.name}</span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="btn-light"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Created
              </label>
              <span className="text-white">
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Project Owners Section */}
        <ProjectOwnersList projectId={project.id} />

        {/* Danger Zone - Only for Admins */}
        {user?.role === 'admin' && (
          <div className="sleek-card p-6 border-l-4 border-red-500">
            <h2 className="text-lg font-medium text-red-400 mb-4">Danger Zone</h2>
            
            <div className="bg-red-900/20 p-4 rounded-md border border-red-500/30">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-red-400">Delete Project</h3>
                  <p className="text-sm text-red-300 mt-1">
                    Permanently delete this project and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={deleteProject}
                  disabled={deleting}
                  className="btn-dark bg-red-600 hover:bg-red-700 ml-4"
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