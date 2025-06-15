import React from 'react';
import Layout from '@/components/layout/Layout';
import LoginForm from '@/components/auth/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <Layout>
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoginForm />
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;