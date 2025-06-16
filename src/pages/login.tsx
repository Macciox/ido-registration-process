import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import ProjectOwnerLoginForm from '@/components/auth/ProjectOwnerLoginForm';
import RegisterForm from '@/components/auth/RegisterForm';

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'admin' | 'project-owner' | 'register'>('admin');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3">
              {/* Admin Login Tab */}
              <div 
                className={`p-6 cursor-pointer ${activeTab === 'admin' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('admin')}
              >
                <div className="flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.035-.691-.1-1.022A4.96 4.96 0 0010 11z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-xl font-bold">Admin Login</h2>
                </div>
                <p className="text-center">
                  Access the admin dashboard
                </p>
              </div>

              {/* Project Owner Tab */}
              <div 
                className={`p-6 cursor-pointer ${activeTab === 'project-owner' 
                  ? 'bg-secondary text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('project-owner')}
              >
                <div className="flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <h2 className="text-xl font-bold">Project Owner Login</h2>
                </div>
                <p className="text-center">
                  Access your project details
                </p>
              </div>
              
              {/* Register Tab */}
              <div 
                className={`p-6 cursor-pointer ${activeTab === 'register' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('register')}
              >
                <div className="flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <h2 className="text-xl font-bold">Register Account</h2>
                </div>
                <p className="text-center">
                  Create a new project owner account
                </p>
              </div>
            </div>

            {/* Login Form Container */}
            <div className="p-8 border-t border-gray-200">
              {activeTab === 'admin' ? (
                <AdminLoginForm />
              ) : activeTab === 'project-owner' ? (
                <ProjectOwnerLoginForm />
              ) : (
                <RegisterForm />
              )}
              
              {/* Registration/Login Toggle */}
              <div className="mt-6 text-center">
                {activeTab === 'register' ? (
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button 
                      onClick={() => setActiveTab('project-owner')}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Log in
                    </button>
                  </p>
                ) : activeTab === 'project-owner' && (
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button 
                      onClick={() => setActiveTab('register')}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Register
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;