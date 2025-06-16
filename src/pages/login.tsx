import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import ProjectOwnerLoginForm from '@/components/auth/ProjectOwnerLoginForm';
import RegisterForm from '@/components/auth/RegisterForm';

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
    <Layout>
      <div className="py-12">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-center text-primary mb-2">
                {showRegister ? "Register Account" : "Project Owner Login"}
              </h1>
              <p className="text-center text-gray-600 mb-4">
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
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Log in
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button 
                      onClick={() => setShowRegister(true)}
                      className="text-primary hover:text-primary-dark font-medium"
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
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {showAdminLogin ? "Hide Admin Login" : "Admin Login"}
              </button>
              
              {showAdminLogin && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h2 className="text-lg font-medium mb-4 text-gray-700">Admin Login</h2>
                  <AdminLoginForm />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;