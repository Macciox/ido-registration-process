import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database.types';
import AdminWhitelistSection from '@/components/admin/AdminWhitelistSection';
import { useVerifyAdminWhitelist } from '@/hooks/useVerifyAdminWhitelist';

interface ProjectSummary {
  id: string;
  name: string;
  owner_email: string;
  created_at: string;
  completion_percentage: number;
}

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  useVerifyAdminWhitelist(user || undefined);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'warning'} | null>(null);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          window.location.href = '/login';
          return;
        }
        
        // Set active tab from URL query parameter if available
        if (router.query.tab === 'settings') {
          setActiveTab('settings');
        }
        
        setUser(currentUser);
        loadProjects();
      } catch (err) {
        console.error('Auth check error:', err);
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router, router.query.tab]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get completion percentage for each project
      const projectsWithCompletion = await Promise.all(
        (data || []).map(async (project) => {
          const completion = await getProjectCompletion(project.id);
          return {
            ...project,
            completion_percentage: completion
          };
        })
      );
      
      setProjects(projectsWithCompletion);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const getProjectCompletion = async (projectId: string): Promise<number> => {
    try {
      // Get all fields for the project
      const { data: fields, error } = await supabase
        .from('project_fields')
        .select('status')
        .eq('project_id', projectId);
      
      if (error || !fields || fields.length === 0) return 0;
      
      // Calculate percentage of confirmed fields
      const confirmedFields = fields.filter(field => field.status === 'Confirmed').length;
      return Math.round((confirmedFields / fields.length) * 100);
    } catch (err) {
      console.error('Error calculating project completion:', err);
      return 0;
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
          {/* Messages */}
          {message && (
            <div className={`alert mb-6 ${
              message.type === 'success' ? 'alert-success' : 
              message.type === 'warning' ? 'alert-warning' :
              'alert-error'
            }`}>
              <div className="alert-icon">{message.type === 'success' ? '✓' : '⚠'}</div>
              <p>{message.text}</p>
            </div>
          )}
          
          {/* Header with navigation */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                <p className="text-text-secondary">Manage your IDO projects and platform settings</p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <a
                  href="/admin/dashboard"
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'projects' 
                      ? 'text-primary' 
                      : 'text-white hover:text-primary'
                  }`}
                >
                  Projects
                </a>
                
                {user?.role === 'admin' && (
                  <>
                    <a
                      href="/admin/projects/new"
                      className="px-4 py-2 text-white hover:text-primary text-sm font-medium transition-colors"
                    >
                      New Project
                    </a>
                    
                    <a
                      href="/project/announcements"
                      className="px-4 py-2 text-white hover:text-primary text-sm font-medium transition-colors"
                    >
                      📅 Announcements
                    </a>
                    
                    <a
                      href="/admin/tools"
                      className="px-4 py-2 text-white hover:text-primary text-sm font-medium transition-colors"
                    >
                      Tools
                    </a>
                    
                    <a
                      href="/admin/dashboard?tab=settings"
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        router.query.tab === 'settings'
                          ? 'text-primary'
                          : 'text-white hover:text-primary'
                      }`}
                    >
                      Settings
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Projects Section */}
          {activeTab === 'projects' && (
            <div className="sleek-card p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">All Projects</h2>
              </div>
              
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-text-muted text-lg">No projects found</div>
                  <p className="text-text-secondary mt-2">Create your first project to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="sleek-table w-full">
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Owner</th>
                        <th>Created</th>
                        <th>Progress</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project.id}>
                          <td className="font-medium project-name">{project.name}</td>
                          <td className="text-text-secondary">{project.owner_email}</td>
                          <td className="text-text-secondary">
                            {new Date(project.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-white min-w-[40px]">
                                {project.completion_percentage}%
                              </span>
                              <div className="progress-bar w-24">
                                <div 
                                  className="progress-fill"
                                  style={{ width: `${project.completion_percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <a
                                href={`/projects/${project.id}`}
                                className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                                title="View Project"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </a>
                              <a
                                href={`/admin/projects/${project.id}/documents`}
                                className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                                title="Documents & KYB"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                              </a>
                              <a
                                href={`/admin/projects/${project.id}/announcements`}
                                className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                                title="Announcements"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                              </a>
                              <a
                                href={`/admin/projects/${project.id}/settings`}
                                className="p-2 rounded-lg bg-white/10 text-text-secondary hover:bg-white/20 hover:text-white transition-colors"
                                title="Project Settings"
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
          )}
          
          {/* Admin Settings Tab */}
          {activeTab === 'settings' && user?.role === 'admin' && (
            <div className="grid grid-cols-1 gap-6">
              {/* Admin Whitelist */}
              <AdminWhitelistSection />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;