import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if the error is about email not confirmed
        if (error.message.includes('Email not confirmed')) {
          // Offer to resend verification email
          setError('Your email has not been verified. Please check your inbox or request a new verification email.');
          setLoading(false);
          return;
        }
        
        // Check if the user exists but with wrong password
        const { data: userExists } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', email)
          .maybeSingle();
          
        if (userExists) {
          setError('Invalid password. Please try again.');
        } else {
          setError(error.message || 'Invalid login credentials');
        }
        setLoading(false);
        return;
      }

      // Check if the user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        
        // Check if the user is in admin_whitelist or project_owners
        const { data: adminWhitelist } = await supabase
          .from('admin_whitelist')
          .select('id')
          .eq('email', email)
          .maybeSingle();
          
        const { data: projectOwner } = await supabase
          .from('project_owners')
          .select('id')
          .eq('email', email)
          .maybeSingle();
          
        // Determine role
        let role = 'user';
        if (adminWhitelist) {
          role = 'admin';
        } else if (projectOwner) {
          role = 'project_owner';
        }
        
        // Create profile if it doesn't exist
        if (data.user) {
          await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: email,
              role: role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      }

      // Redirect based on user role
      if (profile?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        throw error;
      }
      
      setMessage('Verification email has been sent. Please check your inbox.');
    } catch (err: any) {
      console.error('Error resending verification email:', err);
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          {error.includes('not been verified') && (
            <button
              onClick={resendVerificationEmail}
              className="mt-2 text-sm font-medium text-red-700 underline"
              disabled={loading}
            >
              Resend verification email
            </button>
          )}
        </div>
      )}
      
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
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
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <a
            href="/register"
            className="inline-block align-baseline font-bold text-sm text-primary hover:text-primary-dark"
          >
            Don't have an account? Register
          </a>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;