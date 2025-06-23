import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/emailService';

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
        .select('id, status')
        .eq('email', email)
        .maybeSingle();
      
      if (!adminWhitelist && !projectOwners) {
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

      // Generate a 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time (30 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);
      
      try {
        // Save the code to the database
        const { error: insertError } = await supabase
          .from('verification_codes')
          .insert({
            email: email,
            code: code,
            expires_at: expiresAt.toISOString()
          });
          
        if (insertError) {
          console.error('Error inserting verification code:', insertError);
          throw new Error('Failed to generate verification code');
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        setError('Failed to generate verification code. Please try again.');
        setLoading(false);
        return;
      }
      
      // Update the status in the whitelist
      if (adminWhitelist) {
        await supabase
          .from('admin_whitelist')
          .update({ status: 'pending_verification' })
          .eq('id', adminWhitelist.id);
      }
      
      if (projectOwners) {
        await supabase
          .from('project_owners')
          .update({ status: 'pending_verification' })
          .eq('id', projectOwners.id);
      }

      // Register the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: '', // Disable the default email verification
        }
      });

      if (error) {
        throw error;
      }

      // Send verification email
      await sendVerificationEmail(email, code);
      
      // Always show success message
      setMessage('Registration successful! Please check your email for verification code.');
      
      // Redirect to verification page after a delay
      setTimeout(() => {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      }, 3000);
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