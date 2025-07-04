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
                
              const { data: projectOwner } = await supabase
                .from('project_owners')
                .select('id, status')
                .eq('email', email)
                .maybeSingle();
                
              // Determine role
              let role = 'user';
              if (adminWhitelist && (adminWhitelist.status === 'registered' || adminWhitelist.status === 'pending_verification')) {
                role = 'admin';
              } else if (projectOwner && (projectOwner.status === 'registered' || projectOwner.status === 'pending_verification')) {
                role = 'project_owner';
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

      // Check if the user has a profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .maybeSingle();

      let userRole = 'user';

      if (profileError || !profileData) {
        console.error('Profile error:', profileError);
        
        // Check if the user is in admin_whitelist or project_owners
        const { data: adminWhitelist } = await supabase
          .from('admin_whitelist')
          .select('id, status')
          .eq('email', email)
          .maybeSingle();
          
        const { data: projectOwner } = await supabase
          .from('project_owners')
          .select('id, status')
          .eq('email', email)
          .maybeSingle();
          
        // Determine role
        if (adminWhitelist && (adminWhitelist.status === 'registered' || adminWhitelist.status === 'pending_verification')) {
          userRole = 'admin';
        } else if (projectOwner && (projectOwner.status === 'registered' || projectOwner.status === 'pending_verification')) {
          userRole = 'project_owner';
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
        <link
          href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins&display=swap"
          rel="stylesheet"
        />
      </Head>
      
      <div className="custom-login-wrapper">
        <form onSubmit={handleSubmit}>
          <h1>Login</h1>
          
          {error && (
            <div className="error-message">
              <p>{error}</p>
              {error.includes('not been verified') && (
                <button
                  onClick={resendVerificationEmail}
                  className="resend-btn"
                  disabled={loading}
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}
          
          {message && (
            <div className="success-message">
              {message}
            </div>
          )}
          
          <div className="input-box">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <i className="bx bxs-user"></i>
          </div>
          
          <div className="input-box">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <i className="bx bxs-lock-alt"></i>
          </div>
          
          <div className="remember-forgot">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <a href="/reset-password">Forgot password?</a>
          </div>
          
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <div className="register-link">
            <p>Don't have an account? <a href="/register">Register</a></p>
          </div>
        </form>
      </div>
      
      <style jsx>{`
        .custom-login-wrapper {
          width: 420px;
          background: transparent;
          border: 2px solid rgba(255, 255, 255, .2);
          backdrop-filter: blur(20px);
          box-shadow: 0 0 10px rgba(0, 0, 0, .2);
          color: #fff;
          border-radius: 10px;
          padding: 30px 40px;
        }
        
        .custom-login-wrapper h1 {
          font-size: 36px;
          text-align: center;
          font-family: 'Poppins', sans-serif;
        }
        
        .input-box {
          position: relative;
          width: 100%;
          height: 50px;
          margin: 30px 0;
        }
        
        .input-box input {
          width: 100%;
          height: 100%;
          background: transparent;
          border: 2px solid rgba(255, 255, 255, .2);
          border-radius: 40px;
          font-size: 16px;
          color: #fff;
          padding: 20px 45px 20px 20px;
          outline: none;
        }
        
        .input-box input::placeholder {
          color: #fff;
        }
        
        .input-box i {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
        }
        
        .remember-forgot {
          display: flex;
          justify-content: space-between;
          font-size: 14.5px;
          margin: -15px 0 15px;
        }
        
        .remember-forgot label input {
          accent-color: #fff;
          margin-right: 3px;
        }
        
        .remember-forgot a {
          color: #fff;
          text-decoration: none;
        }
        
        .remember-forgot a:hover {
          text-decoration: underline;
        }
        
        .btn {
          width: 100%;
          height: 45px;
          border-radius: 40px;
          border: none;
          outline: none;
          background: #fff;
          box-shadow: 0 0 10px rgba(0, 0, 0, .1);
          cursor: pointer;
          font-size: 16px;
          color: #333;
          font-weight: 600;
        }
        
        .register-link {
          text-align: center;
          font-size: 14.5px;
          margin: 20px 0 15px;
        }
        
        .register-link p a {
          color: #fff;
          text-decoration: none;
          font-weight: 600;
        }
        
        .register-link p a:hover {
          text-decoration: underline;
        }
        
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fff;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .success-message {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #fff;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .resend-btn {
          background: none;
          border: none;
          color: #fff;
          text-decoration: underline;
          cursor: pointer;
          font-size: 12px;
          margin-top: 8px;
        }
      `}</style>
    </>
  );
};

export default LoginForm;