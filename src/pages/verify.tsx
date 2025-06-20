import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/emailService';

const VerifyPage: React.FC = () => {
  const router = useRouter();
  const { email } = router.query;
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Reset countdown when email changes
    if (email) {
      setCountdown(60);
    }
  }, [email]);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Email is missing. Please go back to the registration page.');
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      // Verify the code
      const { data, error: verifyError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', verificationCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verifyError || !data) {
        setError('Invalid or expired verification code. Please try again or request a new code.');
        setLoading(false);
        return;
      }

      // Mark the code as used
      await supabase
        .from('verification_codes')
        .update({ used: true })
        .eq('id', data.id);

      // Update admin_whitelist status if exists
      const { data: adminWhitelist } = await supabase
        .from('admin_whitelist')
        .select('id')
        .eq('email', email as string)
        .maybeSingle();

      if (adminWhitelist) {
        await supabase
          .from('admin_whitelist')
          .update({ status: 'verified' })
          .eq('id', adminWhitelist.id);
      }

      // Update project_owners status if exists
      const { data: projectOwner } = await supabase
        .from('project_owners')
        .select('id')
        .eq('email', email as string)
        .maybeSingle();

      if (projectOwner) {
        await supabase
          .from('project_owners')
          .update({ status: 'verified', verified_at: new Date().toISOString() })
          .eq('id', projectOwner.id);
      }

      // Create or update profile
      const { data: user } = await supabase.auth.getUser();
      
      if (user?.user) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.user.id)
          .maybeSingle();

        if (!existingProfile) {
          // Determine role
          let role = 'project_owner';
          if (adminWhitelist) {
            role = 'admin';
          }

          // Create profile
          await supabase
            .from('profiles')
            .insert({
              id: user.user.id,
              email: email as string,
              role: role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      }

      setMessage('Email verified successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!email || countdown > 0) return;
    
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Generate a new 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time (30 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);
      
      // Save the code to the database
      await supabase
        .from('verification_codes')
        .insert({
          email: email as string,
          code: code,
          expires_at: expiresAt.toISOString()
        });
      
      // Send email with the code
      await sendVerificationEmail(email as string, code);
      
      // For testing purposes, show the code in the UI
      console.log(`Verification code for ${email}: ${code}`);
      setMessage(`A new verification code has been sent to ${email}. (For testing: ${code})`);
      setCountdown(60);
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Verify Your Email</h1>
        
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
          We've sent a verification code to <strong>{email}</strong>. 
          Please enter the 6-digit code below to verify your email address.
        </p>
        
        <form onSubmit={handleVerify} className="mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="verification-code">
              Verification Code
            </label>
            <input
              id="verification-code"
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
            />
          </div>
          
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
          <button
            onClick={resendCode}
            className="text-primary hover:text-primary-dark font-medium"
            disabled={countdown > 0 || loading}
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default VerifyPage;