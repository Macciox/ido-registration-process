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
      <div className="animated-bg min-h-screen">
        <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-8">
          <LoginForm />
          
          {/* Admin Login Toggle */}
          <div className="text-center">
            <button 
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              className="px-4 py-2 text-sm bg-white/10 border border-white/20 text-text-secondary hover:text-white hover:bg-white/20 rounded-lg transition-all duration-300"
            >
              {showAdminLogin ? "Hide Admin Login" : "Admin Login"}
            </button>
            
            {showAdminLogin && (
              <div className="mt-6 sleek-card p-6 max-w-md w-full">
                <AdminLoginForm />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;