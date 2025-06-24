import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

interface Project {
  id: string;
  name: string;
  created_at: string;
}

const ProjectOwnerDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }

        if (currentUser.role !== 'project_owner') {
          router.push('/dashboard');
          return;
        }

        setUser(currentUser);
        await loadUserProjects(currentUser.email);
      } catch (err: any) {
        console.error('Error initializing dashboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const loadUserProjects = async (email: string) => {
    try {
      // Get projects where user is an owner
      const { data: projectOwners, error } = await supabase
        .from('project_owners')
        .select(`
          project_id,
          projects (
            id,
            name,
            created_at
          )
        `)
        .eq('email', email)
        .eq('status', 'registered');

      if (error) throw error;

      const userProjects = projectOwners
        ?.map(po => po.projects)
        .filter(Boolean)
        .flat() || [];

      setProjects(userProjects);
    } catch (err: any) {
      console.error('Error loading projects:', err);
      setError(err.message);
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Owner Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.email}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Your Projects</h2>
          
          {projects.length === 0 ? (
            <p className="text-gray-500">No projects assigned to you yet.</p>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/project-owner/projects/${project.id}`)}
                >
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProjectOwnerDashboard;