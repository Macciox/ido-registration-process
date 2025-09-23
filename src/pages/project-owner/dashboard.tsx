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
                            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                            title="Documents"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </a>
                          <a
                            href={`/project/announcements`}
                            className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                            title="Announcements"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </a>
                          <a
                            href={`/project-owner/settings`}
                            className="p-2 rounded-lg bg-white/10 text-text-secondary hover:bg-white/20 hover:text-white transition-colors"
                            title="Settings"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
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