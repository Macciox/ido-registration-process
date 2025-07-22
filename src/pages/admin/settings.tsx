import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { getCurrentUser, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database.types';

const AdminSettingsPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
          router.push('/login');
          return;
        }
        setUser(currentUser);
      } catch (err) {
        console.error('Error loading user:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Current password is required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    try {
      // First verify the current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      });

      if (signInError) {
        setPasswordMessage({ type: 'error', text: 'Current password is incorrect' });
        return;
      }

      // Then update to the new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.message || 'Error updating password' });
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (deleteConfirm !== user?.email) {
      setDeleteError('Please type your email correctly to confirm');
      return;
    }

    try {
      // First update admin status in whitelist
      if (user) {
        await supabase
          .from('admin_whitelist')
          .update({ status: 'deleted' })
          .eq('email', user.email);
        
        // Check if admin is associated with any projects
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('created_by', user.id);
        
        if (projects && projects.length > 0) {
          // Update projects to mark the creator as deleted but preserve the project data
          for (const project of projects) {
            await supabase
              .from('projects')
              .update({ creator_status: 'deleted' })
              .eq('id', project.id);
          }
        }
      }

      // Then delete the user authentication but keep the profile record
      const { error } = await supabase.auth.admin.deleteUser(user?.id || '');
      if (error) throw error;

      // Sign out and redirect
      await signOut();
      router.push('/login?message=account-deleted');
    } catch (error: any) {
      setDeleteError(error.message || 'Error deleting account');
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Change Password Section */}
          <div className="sleek-card p-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            
            {passwordMessage && (
              <div className={`mb-4 p-3 rounded ${passwordMessage.type === 'success' ? 'bg-green-100/10 text-green-400 border border-green-400/30' : 'bg-red-100/10 text-red-400 border border-red-400/30'}`}>
                {passwordMessage.text}
              </div>
            )}
            
            <form onSubmit={handleChangePassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="sleek-input w-full"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="sleek-input w-full"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="sleek-input w-full"
                  required
                />
              </div>
              
              <button type="submit" className="btn-dark w-full">
                Update Password
              </button>
            </form>
          </div>
          
          {/* Delete Account Section */}
          <div className="sleek-card p-6 border border-red-500/20">
            <h2 className="text-xl font-semibold mb-4 text-red-400">Delete Account</h2>
            <p className="text-text-secondary mb-4">
              This action cannot be undone. All your data will be permanently removed.
            </p>
            
            {deleteError && (
              <div className="mb-4 p-3 rounded bg-red-100/10 text-red-400 border border-red-400/30">
                {deleteError}
              </div>
            )}
            
            <form onSubmit={handleDeleteAccount}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Type your email <span className="font-bold">{user?.email}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="sleek-input w-full border-red-500/30"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
              >
                Permanently Delete Account
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSettingsPage;