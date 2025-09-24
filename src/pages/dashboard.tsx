import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }
        setUser(currentUser);
        loadProjects(currentUser.id);
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const loadProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error loading projects:', err);
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Compliance Dashboard</h1>
            <p className="text-text-secondary">Analyze whitepapers and legal opinions</p>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="sleek-card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Whitepaper Analysis</h3>
              <p className="text-text-secondary mb-4">Analyze whitepaper compliance and quality</p>
              <a
                href="/compliance?tab=whitepaper"
                className="btn-primary"
              >
                Start Whitepaper Check
              </a>
            </div>
            
            <div className="sleek-card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Legal Opinion Analysis</h3>
              <p className="text-text-secondary mb-4">Review legal opinion documents</p>
              <a
                href="/compliance?tab=legal"
                className="btn-primary"
              >
                Start Legal Check
              </a>
            </div>
          </div>

          {/* Projects Section */}
          <div className="sleek-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Your Projects</h2>
              <a
                href="/projects/new"
                className="btn-primary"
              >
                New Project
              </a>
            </div>
            
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-text-muted text-lg">No projects yet</div>
                <p className="text-text-secondary mt-2">Create a project to organize your compliance analyses</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div key={project.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                    <h3 className="font-medium text-white mb-2">{project.name}</h3>
                    {project.description && (
                      <p className="text-text-secondary text-sm mb-3">{project.description}</p>
                    )}
                    <div className="flex gap-2">
                      <a
                        href={`/compliance?project=${project.id}`}
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Analyze
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;