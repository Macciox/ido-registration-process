import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';

const EmailConfirmPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the hash fragment from the URL
        const hash = window.location.hash.substring(1);
        
        // Parse the hash to get the access_token
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const type = params.get('type');
        
        if (!accessToken) {
          setError('No confirmation token found in URL');
          setLoading(false);
          return;
        }

        if (type !== 'signup' && type !== 'recovery' && type !== 'invite') {
          setError('Invalid confirmation type');
          setLoading(false);
          return;
        }

        // Set the session using the access token
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: params.get('refresh_token') || '',
        });

        if (sessionError) {
          throw sessionError;
        }

        // Get the current user to verify the session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw userError || new Error('Failed to get user information');
        }

        setSuccess(true);
        
        // Redirect to dashboard after a delay
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 3000);
      } catch (err: any) {
        console.error('Email confirmation error:', err);
        setError(err.message || 'Failed to confirm email');
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [router]);

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Email Confirmation</h1>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-600">Processing your confirmation...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <div className="mt-4">
              <button
                onClick={() => router.push('/login')}
                className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Success!</p>
            <p>Your email has been confirmed successfully.</p>
            <p className="mt-2">Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmailConfirmPage;