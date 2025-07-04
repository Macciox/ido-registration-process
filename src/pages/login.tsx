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
      <div className="modern-login-body">
        <div className="login-container">
          <LoginForm />
          
          {/* Admin Login Toggle */}
          <div className="admin-toggle">
            <button 
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              className="admin-btn"
            >
              {showAdminLogin ? "Hide Admin Login" : "Admin Login"}
            </button>
            
            {showAdminLogin && (
              <div className="admin-form">
                <AdminLoginForm />
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .modern-login-body {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #25252b;
          font-family: 'Poppins', sans-serif;
          padding: 20px;
        }
        
        .login-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
        }
        
        .admin-toggle {
          text-align: center;
        }
        
        .admin-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: #fff;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          transition: 0.3s;
        }
        
        .admin-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: #45f3ff;
          box-shadow: 0 0 10px rgba(69, 243, 255, 0.3);
        }
        
        .admin-form {
          margin-top: 20px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </>
  );
};

export default LoginPage;