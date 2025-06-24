import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (data.session) {
        // User is confirmed, redirect to dashboard
        router.push('/dashboard');
      } else if (error) {
        console.error('Confirmation error:', error);
        router.push('/login?error=confirmation_failed');
      }
    };

    handleEmailConfirmation();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Confirming your email...</h1>
        <p>Please wait while we confirm your email address.</p>
      </div>
    </div>
  );
}