import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';

// Local storage key for admin invitations
const LOCAL_STORAGE_KEY = 'admin_invitations';

interface LocalInvitation {
  email: string;
  token: string;
  created_at: string;
  expires_at: string;
}

const AdminInvitePage: React.FC = () => {
  const router = useRouter();
  const { token, email } = router.query;
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [isLocalInvitation, setIsLocalInvitation] = useState(false);

  // Validate the invitation token
  useEffect(() => {
    const validateInvitation = async () => {
      if (!token || !email) return;
      
      try {
        // First try to check in the database
        try {
          const { data, error } = await supabase
            .from('admin_invitations')
            .select('*')
            .eq('token', token)
            .eq('email', email)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .single();
          
          if (!error && data) {
            setInvitation(data);
            setIsLocalInvitation(false);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.log('Could not validate invitation from database');
        }
        
        // If not found in database, check localStorage
        const localInvitationsStr = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localInvitationsStr) {
          const localInvitations: LocalInvitation[] = JSON.parse(localInvitationsStr);
          const matchingInvitation = localInvitations.find(inv => 
            inv.token === token && inv.email === email && new Date(inv.expires_at) > new Date()
          );
          
          if (matchingInvitation) {
            setInvitation({
              ...matchingInvitation,
              status: 'pending',
              id: 'local'
            });
            setIsLocalInvitation(true);
            setLoading(false);
            return;
          }
        }
        
        // If we get here, the invitation is invalid
        setError('Invalid or expired invitation link');
        setLoading(false);
      } catch (err) {
        console.error('Error validating invitation:', err);
        setError('Failed to validate invitation');
        setLoading(false);
      }
    };
    
    validateInvitation();
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setValidating(true);
    setError(null);
    
    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password
      });
      
      if (authError) throw authError;
      
      // Update the user role to admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('email', invitation.email);
      
      if (updateError) throw updateError;
      
      // If it's a database invitation, mark it as accepted
      if (!isLocalInvitation) {
        await supabase
          .from('admin_invitations')
          .update({ 
            status: 'accepted',
            used_at: new Date().toISOString() 
          })
          .eq('id', invitation.id);
      } else {
        // If it's a local invitation, remove it from localStorage
        const localInvitationsStr = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localInvitationsStr) {
          const localInvitations: LocalInvitation[] = JSON.parse(localInvitationsStr);
          const updatedInvitations = localInvitations.filter(inv => inv.token !== token);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedInvitations));
        }
      }
      
      setSuccess(true);
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error creating admin account:', err);
      setError(err.message || 'Failed to create admin account');
    } finally {
      setValidating(false);
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
      <div className="py-12">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8">
            <h1 className="text-2xl font-bold text-center text-primary mb-6">Admin Account Setup</h1>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {success ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p>Admin account created successfully!</p>
                <p className="mt-2">Redirecting to login page...</p>
              </div>
            ) : invitation ? (
              <>
                {isLocalInvitation && (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                    <p>This is a locally stored invitation. Your admin account will still be created correctly.</p>
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="form-label" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="form-input bg-gray-100"
                      value={invitation.email}
                      readOnly
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label" htmlFor="password">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="form-label" htmlFor="confirm-password">
                      Confirm Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      className="form-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={validating}
                  >
                    {validating ? 'Creating Account...' : 'Create Admin Account'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center text-red-600">
                Invalid or expired invitation link
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminInvitePage;