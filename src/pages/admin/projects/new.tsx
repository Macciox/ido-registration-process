import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database.types';

const NewProject: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/login');
          return;
        }
        
        if (currentUser.role !== 'admin') {
          router.push('/admin/dashboard');
          return;
        }
        
        setUser(currentUser);
        setOwnerEmail(currentUser.email);
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      setError('Please enter a project name');
      return;
    }
    
    if (!ownerEmail.trim()) {
      setError('Please enter an owner email');
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      // Check if owner already exists in profiles
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', ownerEmail.trim())
        .single();
      
      let ownerId = null;
      
      if (ownerData) {
        // Owner already registered - check if already owns another project
        const { data: existingProject } = await supabase
          .from('projects')
          .select('name')
          .eq('owner_id', ownerData.id)
          .single();
        
        if (existingProject) {
          setError(`This user already owns project: "${existingProject.name}". Each user can only own one project.`);
          setCreating(false);
          return;
        }
        
        ownerId = ownerData.id;
      } else {
        // Check if email already pending for another project
        const { data: existingPending } = await supabase
          .from('project_owners')
          .select('*')
          .eq('email', ownerEmail.trim())
          .single();
        
        if (existingPending) {
          setError(`This email is already pending registration for another project. Each user can only own one project.`);
          setCreating(false);
          return;
        }
      }
      
      // Create the project first
      const { data, error } = await supabase
        .from('projects')
        .insert([
          { 
            name: projectName.trim(),
            owner_email: ownerEmail.trim(),
            owner_id: ownerId
          }
        ])
        .select();
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('No data returned from project creation');
      }
      
      // If owner not registered, add to project_owners whitelist with project_id
      if (!ownerData) {
        const { error: whitelistError } = await supabase
          .from('project_owners')
          .insert({
            email: ownerEmail.trim(),
            status: 'pending',
            project_id: data[0].id
          });
        
        if (whitelistError && whitelistError.code !== '23505') {
          throw whitelistError;
        }
      }
      
      router.push(`/projects/${data[0].id}`);
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project');
      setCreating(false);
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
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white">Create New Project</h1>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="btn-light flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          </div>
          
          <div className="sleek-card p-6">
            {error && (
              <div className="alert alert-error mb-4">
                <div className="alert-icon">⚠</div>
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="project-name">
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  className="sleek-input w-full"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="owner-email">
                  Project Owner Email
                </label>
                <input
                  id="owner-email"
                  type="email"
                  className="sleek-input w-full"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="Enter owner email"
                  required
                />
                <p className="text-sm text-text-muted mt-1">
                  If the owner doesn't have an account, they will receive an invitation to register.
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-dark"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
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