import React from 'react';
import Layout from '@/components/layout/Layout';
import RegisterForm from '@/components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <RegisterForm />
        </div>
      </div>
    </Layout>
  );
};

export default RegisterPage;