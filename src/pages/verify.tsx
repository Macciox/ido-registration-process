import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';

const VerifyPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get email from query params
    if (router.query.email) {
      setEmail(router.query.email as string);
    }
  }, [router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (!email) {
        throw new Error('Email is required');
      }

      if (!code) {
        throw new Error('Verification code is required');
      }

      // Check if the code is valid
      const { data: verificationData, error: verificationError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verificationError || !verificationData) {
        throw new Error('Invalid or expired verification code');
      }

      // Mark the email as confirmed in Supabase Auth
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        verificationData.user_id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error('Error confirming email:', confirmError);
        throw new Error('Failed to confirm email');
      }

      // Update the verification code status
      await supabase
        .from('verification_codes')
        .update({ used: true })
        .eq('id', verificationData.id);

      // Update the user's profile
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData?.user) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        
        if (!existingProfile) {
          // Create profile if it doesn't exist
          await supabase.from('profiles').insert({
            user_id: userData.user.id,
            email: email,
            email_verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } else {
          // Update existing profile
          await supabase
            .from('profiles')
            .update({
              email_verified: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userData.user.id);
        }
      }

      setMessage('Email verified successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Verify Your Email</h2>
          
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
                disabled={!!router.query.email}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="code">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the 6-digit code from your email"
                required
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default VerifyPage;