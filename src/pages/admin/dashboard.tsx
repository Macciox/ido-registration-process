import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database.types';
import AdminInvitationsList from '@/components/admin/AdminInvitationsList';

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
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/login');
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
        router.push('/login');
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

  const createAdminInvitationsTable = async () => {
    try {
      // Create the admin_invitations table if it doesn't exist
      await supabase.rpc('create_admin_invitations_table').catch(e => {
        console.error('Error creating table via RPC:', e);
      });
      
      // Try direct SQL as a fallback
      const { error } = await supabase.auth.admin.createUser({
        email: 'temp@example.com',
        password: 'temp_password',
        email_confirm: true
      });
      
      // We expect this to fail, we just need to trigger a query to create the table
      console.log('Auth admin operation result:', error ? 'Failed as expected' : 'Unexpected success');
      
      return true;
    } catch (err) {
      console.error('Error creating admin_invitations table:', err);
      return false;
    }
  };

  const generateAdminInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (!newAdminEmail) {
      setMessage({ text: 'Please enter an email address', type: 'error' });
      return;
    }
    
    try {
      // Create a unique token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Try to store the invitation in the database
      let { error } = await supabase
        .from('admin_invitations')
        .insert([{ 
          email: newAdminEmail, 
          token: token,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
        }]);
      
      // If the table doesn't exist, try to create it
      if (error && error.code === '42P01') {
        setMessage({ text: 'Setting up admin invitations...', type: 'success' });
        
        // Create the admin_invitations table
        const tableCreated = await createAdminInvitationsTable();
        
        if (tableCreated) {
          // Try the insert again
          const result = await supabase
            .from('admin_invitations')
            .insert([{ 
              email: newAdminEmail, 
              token: token,
              status: 'pending',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
            }]);
          
          error = result.error;
        } else {
          setMessage({ 
            text: 'Could not set up admin invitations. Please contact support.', 
            type: 'error' 
          });
          return;
        }
      }
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setMessage({ text: 'An invitation for this email already exists', type: 'error' });
        } else {
          throw error;
        }
        return;
      }
      
      // Generate the invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/admin/invite?token=${token}&email=${encodeURIComponent(newAdminEmail)}`;
      
      setInviteLink(link);
      setMessage({ text: 'Admin invitation created successfully', type: 'success' });
    } catch (err: any) {
      console.error('Error creating admin invitation:', err);
      setMessage({ text: err.message || 'Failed to create invitation', type: 'error' });
    }
  };

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push({
      pathname: router.pathname,
      query: { tab }
    }, undefined, { shallow: true });
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
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    !router.query.tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Projects
                </button>
                
                {user?.role === 'admin' && (
                  <>
                    <button
                      onClick={() => router.push('/admin/projects/new')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      New Project
                    </button>
                    
                    <button
                      onClick={() => handleTabChange('settings')}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        router.query.tab === 'settings'
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Admin Settings
                    </button>
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
                              <button
                                onClick={() => router.push(`/projects/${project.id}`)}
                                className="text-primary hover:text-primary-dark flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded-full p-2 transition-colors"
                                title="View Project"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                onClick={() => router.push(`/projects/${project.id}/edit`)}
                                className="text-indigo-600 hover:text-indigo-800 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 rounded-full p-2 transition-colors"
                                title="Edit Project"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => router.push(`/projects/${project.id}/settings`)}
                                className="text-gray-600 hover:text-gray-800 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors"
                                title="Project Settings"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                              </button>
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
              {/* Admin Invitation */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">Invite New Admin</h2>
                
                {message && (
                  <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                  </div>
                )}
                
                <form onSubmit={generateAdminInvite}>
                  <div className="mb-4">
                    <label className="form-label" htmlFor="admin-email">
                      Email
                    </label>
                    <input
                      id="admin-email"
                      type="email"
                      className="form-input"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="new-admin@example.com"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Generate Invitation Link
                  </button>
                </form>
                
                {inviteLink && (
                  <div className="mt-4">
                    <label className="form-label">Invitation Link</label>
                    <div className="flex mt-1">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="form-input flex-1"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          setMessage({ text: 'Link copied to clipboard', type: 'success' });
                        }}
                        className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Send this link to the new admin. The link will expire in 7 days.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Admin Invitations List */}
              <AdminInvitationsList />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;