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
  const [needsVerification, setNeedsVerification] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setNeedsVerification(false);

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

      // Check if the email is already in auth.users but not verified
      try {
        const { data: authUser, error: authError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false
          }
        });

        // If no error, it means the user exists but might not be verified
        if (!authError && authUser) {
          setNeedsVerification(true);
          setLoading(false);
          return;
        }
      } catch (authCheckErr) {
        // Ignore errors here, we're just checking if the user exists
        console.log('Auth check error:', authCheckErr);
      }

      // If we get here, proceed with registration
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        // If the error is about the user already existing
        if (error.message.includes('already registered')) {
          setNeedsVerification(true);
          setLoading(false);
          return;
        }
        throw error;
      }

      setMessage('Registration successful! Please check your email for verification.');
      
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
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (resendError) {
        throw resendError;
      }

      setMessage('A confirmation email has been resent. Please check your inbox.');
      setNeedsVerification(false);
    } catch (err: any) {
      console.error('Error resending verification email:', err);
      setError(err.message || 'Failed to resend verification email');
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

      {needsVerification ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Email verification needed</p>
          <p>This email has already been registered but not verified. Would you like to resend the verification email?</p>
          <div className="mt-4 flex space-x-4">
            <button
              onClick={resendVerificationEmail}
              className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </button>
            <button
              onClick={() => router.push('/login')}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Go to Login
            </button>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default RegisterForm;