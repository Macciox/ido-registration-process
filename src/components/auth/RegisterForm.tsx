import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

const RegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');
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
      // First check if email is in any whitelist
      const { data: adminWhitelist } = await supabase
        .from('admin_whitelist')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();
      
      const { data: projectOwners } = await supabase
        .from('project_owners')
        .select('id, status, project_id')
        .eq('email', email);
      
      console.log('Whitelist check:', { adminWhitelist, projectOwners });
      
      if (!adminWhitelist && (!projectOwners || projectOwners.length === 0)) {
        setError('Registration is restricted. Your email is not in the allowed list.');
        setLoading(false);
        return;
      }

      // Check if the user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        setError('This email is already registered. Please login instead.');
        setLoading(false);
        return;
      }

      // Register the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      });

      if (error) {
        throw error;
      }

      // Update whitelist status and create profile
      if (adminWhitelist) {
        await supabase
          .from('admin_whitelist')
          .update({ status: 'registered' })
          .eq('id', adminWhitelist.id);
        
        // Create admin profile
        await supabase
          .from('profiles')
          .insert({
            id: data.user?.id,
            email: email,
            role: 'admin'
          });
      }
      
      if (projectOwners && projectOwners.length > 0) {
        // Update all project owner entries for this email
        for (const owner of projectOwners) {
          await supabase
            .from('project_owners')
            .update({ status: 'registered' })
            .eq('id', owner.id);
        }
        
        // Create project owner profile
        await supabase
          .from('profiles')
          .insert({
            id: data.user?.id,
            email: email,
            role: 'project_owner'
          });
      }

      setMessage('Registrazione avvenuta con successo!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Create an Account</h2>
      
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
        
        <div className="mb-4">
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
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-password">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <a
            href="/login"
            className="inline-block align-baseline font-bold text-sm text-primary hover:text-primary-dark"
          >
            Already have an account? Login
          </a>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;