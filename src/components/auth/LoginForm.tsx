import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Head from 'next/head';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDebugInfo(null);
    setLoading(true);

    try {
      // Debug: Check if user exists in auth.users
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.log('Auth check error:', authError);
      } else {
        console.log('Current auth user:', authUser);
      }

      // Debug: Check if email exists in admin_whitelist
      const { data: adminCheck } = await supabase
        .from('admin_whitelist')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      console.log('Admin whitelist check:', adminCheck);

      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        
        // Check if the error is about email not confirmed
        if (error.message.includes('Email not confirmed')) {
          // Offer to resend verification email
          setError('Your email has not been verified. Please check your inbox or request a new verification email.');
          setLoading(false);
          return;
        }
        
        // Check if the user exists but with wrong password
        const { data: userExists } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', email)
          .maybeSingle();
          
        if (userExists) {
          setError('Invalid password. Please try again.');
        } else {
          // Debug: Check if user exists in auth.users
          try {
            const { data: authUsers } = await supabase.auth.admin.listUsers();
            const matchingUser = authUsers?.users.find(u => u.email === email);
            
            if (matchingUser) {
              setDebugInfo(`User exists in auth.users but not in profiles. User ID: ${matchingUser.id}`);
              
              // Try to create profile for this user
              const { data: adminWhitelist } = await supabase
                .from('admin_whitelist')
                .select('id, status')
                .eq('email', email)
                .maybeSingle();
                
              // Determine role
              let role = 'project_owner'; // Default role for new users
              if (adminWhitelist && (adminWhitelist.status === 'registered' || adminWhitelist.status === 'pending_verification')) {
                role = 'admin';
              }
              
              // Create profile
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: matchingUser.id,
                  email: email,
                  role: role,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                
              if (insertError) {
                setDebugInfo(`${debugInfo}\nFailed to create profile: ${insertError.message}`);
              } else {
                setDebugInfo(`${debugInfo}\nProfile created successfully. Please try logging in again.`);
              }
            } else {
              setDebugInfo('User does not exist in auth.users');
            }
          } catch (adminError) {
            console.error('Admin API error:', adminError);
            setDebugInfo('Failed to check auth.users (admin API access required)');
          }
          
          setError(error.message || 'Invalid login credentials');
        }
        setLoading(false);
        return;
      }

      // Update projectowner_whitelist status to 'registered' if user has verified email
      if (data.user?.email_confirmed_at) {
        try {
          const { error: updateError } = await supabase
            .from('projectowner_whitelist')
            .update({ status: 'registered' })
            .eq('email', email)
            .in('status', ['pending_verification', 'pending']);
          
          if (updateError) {
            console.error('Error updating projectowner_whitelist on login:', updateError);
          } else {
            console.log('Updated projectowner_whitelist status to registered for:', email);
          }
        } catch (err) {
          console.error('Error in projectowner_whitelist update on login:', err);
        }
      }

      // Check if the user has a profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .maybeSingle();

      let userRole = 'user';

      if (profileError || !profileData) {
        console.error('Profile error:', profileError);
        
        // Check if the user is in admin_whitelist or projectowner_whitelist
        const { data: adminWhitelist } = await supabase
          .from('admin_whitelist')
          .select('id, status')
          .eq('email', email)
          .maybeSingle();
          
        // Determine role
        if (adminWhitelist && (adminWhitelist.status === 'registered' || adminWhitelist.status === 'pending_verification')) {
          userRole = 'admin';
        } else {
          userRole = 'project_owner'; // Default role for non-admin users
        }
        
        // Create profile if it doesn't exist
        if (data.user) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: email,
              role: userRole,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          console.log('Created new profile with role:', userRole, 'Result:', newProfile, 'Error:', insertError);
          
          if (insertError) {
            console.error('Failed to create profile:', insertError);
            setError('Failed to create user profile. Please contact support.');
            setLoading(false);
            return;
          }
        }
      } else {
        // Use the role from the existing profile
        userRole = profileData.role;
      }

      // Redirect based on user role
      if (userRole === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        throw error;
      }
      
      setMessage('Verification email has been sent. Please check your inbox.');
    } catch (err: any) {
      console.error('Error resending verification email:', err);
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      
      <div className="sleek-login-container">
        <div className="sleek-card login-card">
          <div className="login-header">
            <div className="logo-container">
              <div className="logo-glow"></div>
              <img src="/assets/decubate-logo.svg" alt="Decubate Technologies" className="logo" />
            </div>
            <p>Welcome back to the future of IDO management</p>
          </div>
          
          {error && (
            <div className="alert alert-error">
              <div className="alert-icon">⚠</div>
              <div>
                <p>{error}</p>
                {error.includes('not been verified') && (
                  <button
                    onClick={resendVerificationEmail}
                    className="link-btn"
                    disabled={loading}
                  >
                    Resend verification email
                  </button>
                )}
              </div>
            </div>
          )}
          
          {message && (
            <div className="alert alert-success">
              <div className="alert-icon">✓</div>
              <p>{message}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="sleek-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="sleek-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button
              type="submit"
              className="btn-dark login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="login-footer">
            <a href="/reset-password" className="link">Forgot Password?</a>
            <a href="/register" className="link primary">Create Account</a>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .sleek-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
        }
        
        .sleek-login-container::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('/assets/Vector.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.1;
          z-index: 0;
        }
        
        .sleek-login-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 300%;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(128, 82, 241, 0.1) 50%, transparent 100%);
          animation: slideHorizontal 15s ease-in-out infinite;
        }
        
        @keyframes slideHorizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(33.33%); }
        }
        
        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          position: relative;
          z-index: 2;
        }
        
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .logo-container {
          position: relative;
          display: inline-block;
          margin-bottom: 16px;
        }
        
        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: var(--accent-gradient);
          border-radius: 50%;
          filter: blur(20px);
          opacity: 0.3;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
        
        .logo {
          height: 40px;
          width: auto;
          position: relative;
          z-index: 1;
          filter: brightness(1.1);
        }
        
        .login-header p {
          color: var(--text-secondary);
          font-size: 14px;
          margin: 8px 0 0 0;
        }
        
        .alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 14px;
        }
        
        .alert-error {
          background: rgba(240, 113, 97, 0.1);
          border: 1px solid rgba(240, 113, 97, 0.3);
          color: #F07161;
        }
        
        .alert-success {
          background: rgba(45, 219, 156, 0.1);
          border: 1px solid rgba(45, 219, 156, 0.3);
          color: #2DDB9C;
        }
        
        .alert-icon {
          font-size: 16px;
          margin-top: 2px;
        }
        
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
        }
        
        .login-btn {
          width: 100%;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 16px;
          margin-top: 8px;
        }
        
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .login-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.3s ease;
        }
        
        .link:hover {
          color: var(--text-primary);
        }
        
        .link.primary {
          color: var(--accent-purple);
          font-weight: 500;
        }
        
        .link.primary:hover {
          color: var(--accent-cyan);
        }
        
        .link-btn {
          background: none;
          border: none;
          color: var(--accent-cyan);
          text-decoration: underline;
          cursor: pointer;
          font-size: 12px;
          margin-top: 8px;
          transition: color 0.3s ease;
        }
        
        .link-btn:hover {
          color: var(--text-primary);
        }
      `}</style>
    </>
  );
};

export default LoginForm;