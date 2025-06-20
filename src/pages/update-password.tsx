import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';

const UpdatePasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  // Check if user is authenticated with a recovery token
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('Invalid or expired password reset link. Please request a new one.');
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setMessage('Password updated successfully! Redirecting to login...');
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'An error occurred while updating your password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Update Password</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              New Password
            </label>
            <input
              id="password"
              type="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-password">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>
          
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default UpdatePasswordPage;