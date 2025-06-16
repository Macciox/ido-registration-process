import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database.types';

interface ProjectSummary {
  id: string;
  name: string;
  owner_email: string;
  created_at: string;
  completion_percentage: number;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/login');
          return;
        }
        
        setUser(currentUser);
        
        // Load projects based on user role
        if (currentUser.role === 'admin') {
          await loadAllProjects();
        } else {
          await loadUserProjects(currentUser.email);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const loadAllProjects = async () => {
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

  const loadUserProjects = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_email', email);
      
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
      
      // If there's only one project, redirect to it
      if (data && data.length === 1) {
        router.push(`/projects/${data[0].id}`);
      }
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {user?.role === 'admin' ? 'Admin Dashboard' : 'Project Dashboard'}
          </h1>
          
          {projects.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 mb-4">
                {user?.role === 'admin' 
                  ? "No projects have been created yet." 
                  : "You don't have any projects yet."}
              </p>
              {user?.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin/projects/new')}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                >
                  Create New Project
                </button>
              )}
              {user?.role !== 'admin' && (
                <p className="text-gray-500">Please contact an administrator to create a project for you.</p>
              )}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">
                  {user?.role === 'admin' ? 'All Projects' : 'Your Projects'}
                </h2>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => router.push('/admin/projects/new')}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                  >
                    Create New Project
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      {user?.role === 'admin' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.name}</td>
                        {user?.role === 'admin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.owner_email}</td>
                        )}
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
                          <button
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="text-primary hover:text-primary-dark"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;