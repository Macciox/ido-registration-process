import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { type EmailOtpType } from '@supabase/supabase-js';

export default function ConfirmPage() {
  const router = useRouter();
  const { token_hash, type, next } = router.query;

  useEffect(() => {
    const handleConfirmation = async () => {
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as EmailOtpType,
          token_hash: token_hash as string,
        });
        
        if (!error) {
          router.push((next as string) || '/dashboard');
        } else {
          router.push('/login?error=confirmation_failed');
        }
      } else {
        router.push('/login?error=invalid_link');
      }
    };

    if (router.isReady) {
      handleConfirmation();
    }
  }, [router, token_hash, type, next]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Confirming your email...</h1>
        <p>Please wait while we verify your email address.</p>
      </div>
    </div>
  );
}