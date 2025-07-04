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
        <link href="https://fonts.googleapis.com/css?family=Poppins:200,300,400,500,600,700,800,900&display=swap" rel="stylesheet" />
        <link href="https://use.fontawesome.com/releases/v6.5.1/css/all.css" rel="stylesheet" />
      </Head>
      
      <div className="box">
        <div className="login">
          <div className="loginBx">
            <h2>
              <i className="fa-solid fa-right-to-bracket"></i>
              Login
              <i className="fa-solid fa-heart"></i>
            </h2>
            
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
            
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                type="submit"
                value={loading ? 'Signing in...' : 'Sign in'}
                disabled={loading}
              />
            </form>
            
            <div className="group">
              <a href="/reset-password">Forgot Password</a>
              <a href="/register">Sign up</a>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @property --a {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }
        
        .box {
          position: relative;
          width: 400px;
          height: 200px;
          background: repeating-conic-gradient(
            from var(--a),
            #ff2770 0%,
            #ff2770 5%,
            transparent 5%,
            transparent 40%,
            #ff2770 50%
          );
          filter: drop-shadow(0 15px 50px #000);
          border-radius: 20px;
          animation: rotating 4s linear infinite;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: 0.5s;
        }
        
        @keyframes rotating {
          0% { --a: 0deg; }
          100% { --a: 360deg; }
        }
        
        .box::before {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background: repeating-conic-gradient(
            from var(--a),
            #45f3ff 0%,
            #45f3ff 5%,
            transparent 5%,
            transparent 40%,
            #45f3ff 50%
          );
          filter: drop-shadow(0 15px 50px #000);
          border-radius: 20px;
          animation: rotating 4s linear infinite;
          animation-delay: -1s;
        }
        
        .box::after {
          content: "";
          position: absolute;
          inset: 4px;
          background: #2d2d39;
          border-radius: 15px;
          border: 8px solid #25252b;
        }
        
        .box:hover {
          width: 450px;
          height: 500px;
        }
        
        .box:hover .login {
          inset: 40px;
        }
        
        .box:hover .loginBx {
          transform: translateY(0px);
        }
        
        .login {
          position: absolute;
          inset: 60px;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          border-radius: 10px;
          background: #00000033;
          color: #fff;
          z-index: 1000;
          box-shadow: inset 0 10px 20px #00000080;
          border-bottom: 2px solid #ffffff80;
          transition: 0.5s;
          overflow: hidden;
        }
        
        .loginBx {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          gap: 20px;
          width: 70%;
          transform: translateY(126px);
          transition: 0.5s;
        }
        
        .loginBx h2 {
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.2em;
          margin: 0;
          font-family: 'Poppins', sans-serif;
        }
        
        .loginBx h2 i {
          color: #ff2770;
          text-shadow: 0 0 5px #ff2770, 0 0 20px #ff2770;
        }
        
        .loginBx input {
          width: 100%;
          padding: 10px 20px;
          outline: none;
          border: 2px solid #fff;
          font-size: 1em;
          color: #fff;
          background: #0000001a;
          border-radius: 30px;
          font-family: 'Poppins', sans-serif;
        }
        
        .loginBx input::placeholder {
          color: #999;
        }
        
        .loginBx input[type="submit"] {
          background: #45f3ff;
          border: none;
          font-weight: 500;
          color: #111;
          cursor: pointer;
          transition: 0.5s;
        }
        
        .loginBx input[type="submit"]:hover {
          box-shadow: 0 0 10px #45f3ff, 0 0 60px #45f3ff;
        }
        
        .group {
          width: 100%;
          display: flex;
          justify-content: space-between;
        }
        
        .group a {
          color: #fff;
          text-decoration: none;
          font-family: 'Poppins', sans-serif;
        }
        
        .group a:nth-child(2) {
          color: #ff2770;
          font-weight: 600;
        }
        
        .error-message {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #ff2770;
          color: #fff;
          padding: 10px;
          border-radius: 10px;
          margin-bottom: 15px;
          width: 100%;
          text-align: center;
        }
        
        .success-message {
          background: rgba(69, 243, 255, 0.2);
          border: 1px solid #45f3ff;
          color: #fff;
          padding: 10px;
          border-radius: 10px;
          margin-bottom: 15px;
          width: 100%;
          text-align: center;
        }
        
        .resend-btn {
          background: none;
          border: none;
          color: #45f3ff;
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