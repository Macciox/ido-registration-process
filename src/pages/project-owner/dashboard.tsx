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
      // Get projects where user is the owner (by email)
      const { data: userProjects, error } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('owner_email', email);

      if (error) throw error;

      setProjects(userProjects || []);
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
        <div className="alert alert-error">
          <div className="alert-icon">⚠</div>
          <p>Error: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Projects</h1>
          <p className="text-text-secondary">Welcome back, {user?.email}</p>
        </div>

        <div className="sleek-card p-6">
          <h2 className="text-lg font-medium text-white mb-4">Your Projects</h2>
          
          {projects.length === 0 ? (
            <p className="text-text-muted">No projects assigned to you yet.</p>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border border-white/10 rounded-lg p-4 hover:bg-white/5 cursor-pointer bg-white/5"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <h3 className="font-medium text-white">{project.name}</h3>
                  <p className="text-sm text-text-muted">
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