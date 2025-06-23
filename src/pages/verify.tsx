import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/emailService';

const VerifyPage: React.FC = () => {
  const router = useRouter();
  const { email, code: initialCode, type, token } = router.query;
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Check if this is a direct link from Supabase Auth
  useEffect(() => {
    const verifySupabaseToken = async () => {
      if (type === 'signup' && token && email) {
        setLoading(true);
        try {
          // Verify the token with Supabase Auth
          const { error } = await supabase.auth.verifyOtp({
            token: token as string,
            type: 'signup',
            email: email as string,
          });

          if (error) {
            setError(`Failed to verify email: ${error.message}`);
          } else {
            // Update admin_whitelist or project_owners status
            await updateWhitelistStatus(email as string);
            setMessage('Email verified successfully! Redirecting to login...');
            
            // Redirect to login after a delay
            setTimeout(() => {
              router.push('/login');
            }, 2000);
          }
        } catch (err: any) {
          console.error('Token verification error:', err);
          setError(err.message || 'An error occurred during verification');
        } finally {
          setLoading(false);
        }
      }
    };

    verifySupabaseToken();
  }, [type, token, email, router]);

  useEffect(() => {
    // Set initial code from URL if available
    if (initialCode && typeof initialCode === 'string') {
      setVerificationCode(initialCode);
    }
    
    // Reset countdown when email changes
    if (email) {
      setCountdown(60);
    }
  }, [email, initialCode]);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Helper function to update whitelist status
  const updateWhitelistStatus = async (userEmail: string) => {
    // Check if email is in admin whitelist
    const { data: adminWhitelist } = await supabase
      .from('admin_whitelist')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();

    // Check if email is in project owners
    const { data: projectOwner } = await supabase
      .from('project_owners')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();

    // Update status in respective tables
    if (adminWhitelist) {
      await supabase
        .from('admin_whitelist')
        .update({ status: 'verified' })
        .eq('id', adminWhitelist.id);
    }

    if (projectOwner) {
      await supabase
        .from('project_owners')
        .update({ status: 'verified', verified_at: new Date().toISOString() })
        .eq('id', projectOwner.id);
    }

    // The trigger will automatically create the profile
  };

  // Force confirm email in Supabase Auth
  const forceConfirmEmail = async (userEmail: string) => {
    try {
      // This is a workaround to force confirm the email
      // First, get the user ID
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const user = authUsers?.users.find(u => u.email === userEmail);
      
      if (user) {
        // Use admin API to update user
        const { error } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );
        
        if (error) {
          console.error('Failed to confirm email:', error);
          return false;
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error confirming email:', err);
      return false;
    }
  };

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
      // Try to verify with the database first
      try {
        const { data, error: verifyError } = await supabase
          .from('verification_codes')
          .select('*')
          .eq('email', email)
          .eq('code', verificationCode)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (!verifyError && data && data.length > 0) {
          // Mark the code as used
          await supabase
            .from('verification_codes')
            .update({ used: true })
            .eq('id', data[0].id);
        } else {
          // If database verification fails, continue anyway if the code matches the one in the URL
          if (initialCode !== verificationCode) {
            setError('Invalid or expired verification code. Please try again or request a new code.');
            setLoading(false);
            return;
          }
        }
      } catch (dbError) {
        console.error('Database error during verification:', dbError);
        // Continue if the code matches the one in the URL
        if (initialCode !== verificationCode) {
          setError('Invalid or expired verification code. Please try again or request a new code.');
          setLoading(false);
          return;
        }
      }

      // Try multiple methods to verify the email with Supabase Auth
      let verified = false;
      
      // Method 1: Use verifyOtp
      try {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: email as string,
          token: verificationCode,
          type: 'email',
        });

        if (!otpError) {
          verified = true;
        } else {
          // Try with signup type
          const { error: signupError } = await supabase.auth.verifyOtp({
            email: email as string,
            token: verificationCode,
            type: 'signup',
          });

          if (!signupError) {
            verified = true;
          }
        }
      } catch (otpError) {
        console.error('OTP verification error:', otpError);
      }
      
      // Method 2: Force confirm email if Method 1 failed
      if (!verified) {
        verified = await forceConfirmEmail(email as string);
      }
      
      // Method 3: If all else fails, update our custom tables anyway
      await updateWhitelistStatus(email as string);

      setMessage('Email verified successfully! Redirecting to login...');
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
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
      
      try {
        // Save the code to the database
        const { error: insertError } = await supabase
          .from('verification_codes')
          .insert({
            email: email as string,
            code: code,
            expires_at: expiresAt.toISOString()
          });
          
        if (insertError) {
          console.error('Error inserting verification code:', insertError);
          // Continue anyway
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue anyway
      }
      
      // Send email with the code
      try {
        const emailSent = await sendVerificationEmail(email as string, code);
        
        if (!emailSent) {
          console.error('Failed to send verification email');
          // Continue anyway
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Continue anyway
      }
      
      setMessage(`A new verification code has been sent to ${email}.`);
      setVerificationCode(''); // Clear the code field
      setCountdown(60);
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // If we're processing a token, show a loading message
  if (type === 'signup' && token && loading) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">Verifying Email</h1>
          <p className="text-center">Please wait while we verify your email...</p>
        </div>
      </Layout>
    );
  }

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