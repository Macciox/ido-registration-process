import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { type EmailOtpType } from '@supabase/supabase-js';

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleConfirmation = async () => {
      const { token, token_hash, type, next } = router.query;
      
      console.log('Confirm params:', { token, token_hash, type, next });
      
      const authToken = token || token_hash;
      
      if (!authToken || !type) {
        setError('No confirmation token found in URL');
        setStatus('error');
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          type: type as EmailOtpType,
          token_hash: authToken as string,
        });
        
        if (error) {
          console.error('Verification error:', error);
          setError(error.message);
          setStatus('error');
        } else {
          setStatus('success');
          setTimeout(() => {
            router.push((next as string) || '/dashboard');
          }, 2000);
        }
      } catch (err: any) {
        console.error('Confirmation error:', err);
        setError(err.message || 'Unknown error');
        setStatus('error');
      }
    };

    if (router.isReady) {
      handleConfirmation();
    }
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Confirming your email...</h1>
          <p>Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Email Confirmation Error</h1>
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4 text-green-600">Email Confirmed!</h1>
        <p>Redirecting to dashboard...</p>
      </div>
    </div>
  );
}