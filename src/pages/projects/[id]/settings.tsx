import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import SimpleProjectOwnersList from '@/components/admin/SimpleProjectOwnersList';

const ProjectSettings: React.FC = () => {
  const router = useRouter();
  const { id: projectId } = router.query;
  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/login');
          return;
        }
        
        setUser(currentUser);
        
        if (projectId && typeof projectId === 'string') {
          await loadProject(currentUser, projectId);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router, projectId]);

  const loadProject = async (currentUser: any, projectId: string) => {
    try {
      // Get project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      
      setProject(project);
      
      // Check if user has access to this project
      const hasAccess = 
        currentUser.role === 'admin' || 
        project.owner_email === currentUser.email;
      
      if (!hasAccess) {
        try {
          // Check if user is in project_owners
          const { data: projectOwner, error: ownerError } = await supabase
            .from('project_owners')
            .select('*')
            .eq('project_id', projectId)
            .eq('email', currentUser.email)
            .maybeSingle();
          
          if (!ownerError && projectOwner) {
            setHasAccess(true);
          } else {
            setError('You do not have permission to access this project');
          }
        } catch (err) {
          // If the table doesn't exist, just deny access
          setError('You do not have permission to access this project');
        }
      } else {
        setHasAccess(true);
      }
    } catch (err: any) {
      console.error('Error loading project:', err);
      setError(err.message || 'Failed to load project');
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="btn btn-primary"
        >
          Back to Dashboard
        </button>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Project not found
        </div>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="btn btn-primary"
        >
          Back to Dashboard
        </button>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Project Settings: {project.name}</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="btn btn-outline"
          >
            View Project
          </button>
          <button
            onClick={() => router.push(`/projects/${projectId}/edit`)}
            className="btn btn-primary"
          >
            Edit Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Project Owners Section */}
        {hasAccess && projectId && typeof projectId === 'string' && (
          <SimpleProjectOwnersList projectId={projectId} />
        )}
        
        {/* Other settings sections can be added here */}
      </div>
    </Layout>
  );
};

export default ProjectSettings;