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
      </div>
    </>
  );
};

export default LoginPage;