import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';

const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // Get the site URL from environment variable or use the current origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      
      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/update-password`,
      });

      if (error) {
        throw error;
      }

      setMessage('Password reset instructions have been sent to your email.');
      
      // Clear the form
      setEmail('');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'An error occurred while sending the reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Reset Password</h1>
        
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
        
        <p className="mb-4 text-gray-700">
          Enter your email address and we'll send you instructions to reset your password.
        </p>
        
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Reset Password'}
          </button>
        </form>
        
        <div className="text-center">
          <a
            href="/login"
            className="text-primary hover:text-primary-dark font-medium"
          >
            Back to Login
          </a>
        </div>
      </div>
    </Layout>
  );
};

export default ResetPasswordPage;