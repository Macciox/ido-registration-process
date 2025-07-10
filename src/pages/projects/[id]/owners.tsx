import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import ProjectOwnersList from '@/components/admin/ProjectOwnersList';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database.types';

const ProjectOwnersPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
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
        
        if (id) {
          await loadProject(id as string);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router, id]);

  const loadProject = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        setError('Project not found');
        return;
      }
      
      setProjectName(data.name);
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Failed to load project');
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

  if (error) {
    return (
      <Layout>
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="alert alert-error mb-4">
              <div className="alert-icon">⚠</div>
              <p>{error}</p>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  window.location.href = '/admin/dashboard';
                }, 100);
              }}
              className="btn-light"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">
              Project Owners: {projectName}
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    window.location.href = `/projects/${id}`;
                  }, 100);
                }}
                className="btn-light"
              >
                View Project
              </button>
              <button
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    window.location.href = '/admin/dashboard';
                  }, 100);
                }}
                className="btn-light"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
          
          <div className="max-w-3xl mx-auto">
            {id && <ProjectOwnersList projectId={id as string} />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProjectOwnersPage;