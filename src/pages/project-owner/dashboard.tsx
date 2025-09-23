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
      // Get projects where user is in projectowner_whitelist with registered status
      const { data: whitelistEntries, error } = await supabase
        .from('projectowner_whitelist')
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

      const userProjects = whitelistEntries
        ?.map(entry => entry.projects)
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
            <div className="overflow-x-auto">
              <table className="sleek-table w-full">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="font-medium project-name">{project.name}</td>
                      <td className="text-text-secondary">
                        {new Date(project.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <a
                            href={`/project/documents`}
                            className="text-sm text-text-secondary hover:text-white transition-colors"
                          >
                            Documents
                          </a>
                          <a
                            href={`/project/announcements`}
                            className="text-sm text-text-secondary hover:text-white transition-colors"
                          >
                            Announcements
                          </a>
                          <a
                            href={`/project-owner/settings`}
                            className="text-sm text-text-secondary hover:text-white transition-colors"
                          >
                            Settings
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProjectOwnerDashboard;