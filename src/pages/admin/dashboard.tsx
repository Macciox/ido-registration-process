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
  useVerifyAdminWhitelist(user);
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
          {/* Header with navigation */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Admin Dashboard</h1>
              
              <div className="flex flex-wrap gap-3">
                <a
                  href="/admin/dashboard"
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    !router.query.tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Projects
                </a>
                
                {user?.role === 'admin' && (
                  <>
                    <a
                      href="/admin/projects/new"
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      New Project
                    </a>
                    
                    <a
                      href="/admin/dashboard?tab=settings"
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        router.query.tab === 'settings'
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Admin Settings
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Projects Section */}
          {activeTab === 'projects' && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">All Projects</h2>
              </div>
              
              {projects.length === 0 ? (
                <p className="text-gray-500">No projects found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {projects.map((project) => (
                        <tr key={project.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.owner_email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(project.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="mr-2 text-sm font-medium text-gray-900">
                                {project.completion_percentage}%
                              </div>
                              <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    project.completion_percentage > 75 ? 'bg-green-500' :
                                    project.completion_percentage > 25 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${project.completion_percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-4">
                              <a
                                href={`/projects/${project.id}`}
                                className="text-primary hover:text-primary-dark flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded-full p-2 transition-colors"
                                title="View Project"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </a>
                              <a
                                href={`/projects/${project.id}/edit`}
                                className="text-indigo-600 hover:text-indigo-800 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 rounded-full p-2 transition-colors"
                                title="Edit Project"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </a>
                              <a
                                href={`/projects/${project.id}/settings`}
                                className="text-gray-600 hover:text-gray-800 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors"
                                title="Project Settings"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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