import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import ProjectOwnerLoginForm from '@/components/auth/ProjectOwnerLoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import LoginForm from '@/components/auth/LoginForm';
import Logo from '@/components/ui/Logo';
import Head from 'next/head';

const LoginPage: React.FC = () => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Check for registration success message
    if (router.query.registered === 'true') {
      // Could add a success toast or message here
    }
  }, [router.query]);

  return (
    <>
      <Head>
        <title>{showRegister ? "Register Account" : "Project Owner Login"} | Decubate IDO</title>
      </Head>
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <LoginForm />
        
        {/* Admin Login Toggle */}
        <div className="fixed bottom-8 right-8">
          <button 
            onClick={() => setShowAdminLogin(!showAdminLogin)}
            className="btn-light text-sm"
          >
            {showAdminLogin ? "Hide Admin" : "Admin"}
          </button>
          
          {showAdminLogin && (
            <div className="absolute bottom-full right-0 mb-4 sleek-card p-6 w-80">
              <AdminLoginForm />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LoginPage;