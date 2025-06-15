import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import ProjectOwnerLoginForm from '@/components/auth/ProjectOwnerLoginForm';

const LoginPage: React.FC = () => {
  const [loginType, setLoginType] = useState<'admin' | 'project-owner'>('admin');

  return (
    <Layout>
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                    loginType === 'admin'
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setLoginType('admin')}
                >
                  Admin Login
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                    loginType === 'project-owner'
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setLoginType('project-owner')}
                >
                  Project Owner Login
                </button>
              </div>
            </div>
            
            {loginType === 'admin' ? <AdminLoginForm /> : <ProjectOwnerLoginForm />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;