import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database.types';

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/login');
          return;
        }
        
        if (currentUser.role !== 'admin') {
          router.push('/dashboard');
          return;
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
  }, [router]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error loading projects:', err);
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
      
      // Store the invitation in the database
      const { error } = await supabase
        .from('admin_invitations')
        .insert([{ 
          email: newAdminEmail, 
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
        }]);
      
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Projects List */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Projects</h2>
              
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
              )}
            </div>
            
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
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;