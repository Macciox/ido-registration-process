import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import ProjectOwnerLoginForm from '@/components/auth/ProjectOwnerLoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
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
      <div className="min-h-screen login-gradient py-12 flex items-center justify-center">
        <div className="max-w-md w-full px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-secondary/10 to-secondary/5">
              <h1 className="text-3xl font-bold text-center text-secondary mb-2">
                {showRegister ? "Register Account" : "Project Owner Login"}
              </h1>
              <p className="text-center text-gray-600">
                {showRegister 
                  ? "Create an account to manage your project" 
                  : "Access your project details and update information"}
              </p>
            </div>

            {/* Login/Register Form Container */}
            <div className="p-8">
              {showRegister ? (
                <RegisterForm />
              ) : (
                <ProjectOwnerLoginForm />
              )}
              
              {/* Registration/Login Toggle */}
              <div className="mt-6 text-center">
                {showRegister ? (
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button 
                      onClick={() => setShowRegister(false)}
                      className="text-secondary hover:text-secondary-dark font-medium"
                    >
                      Log in
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button 
                      onClick={() => setShowRegister(true)}
                      className="text-secondary hover:text-secondary-dark font-medium"
                    >
                      Register
                    </button>
                  </p>
                )}
              </div>
            </div>
            
            {/* Admin Login Toggle */}
            <div className="px-8 pb-6 text-center">
              <button 
                onClick={() => setShowAdminLogin(!showAdminLogin)}
                className="text-xs text-secondary/70 hover:text-secondary"
              >
                {showAdminLogin ? "Hide Admin Login" : "Admin Login"}
              </button>
              
              {showAdminLogin && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <AdminLoginForm />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
    
  );
};

export default LoginPage;