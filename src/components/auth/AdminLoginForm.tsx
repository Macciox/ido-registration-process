import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { signIn } from '@/lib/auth';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

const AdminLoginForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const onSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: authData, error } = await signIn(data.email, data.password);
      
      if (error) {
        setError(error.message);
        return;
      }
      
      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData?.user?.id)
        .single();
      
      if (profileError) {
        console.error('Profile error:', profileError);
        setError('Error checking admin status: ' + profileError.message);
        return;
      }
      
      if (!profile) {
        setError('Profile not found. Please contact support.');
        return;
      }
      
      if (profile.role !== 'admin') {
        setError('You are not authorized as an admin. Your role is: ' + profile.role);
        await supabase.auth.signOut();
        return;
      }
      
      // Redirect to admin dashboard
      window.location.href = '/admin/dashboard';
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sleek-card admin-login-card">
        <div className="admin-header">
          <h2>Admin Access</h2>
          <p>Secure administrative portal</p>
        </div>
        
        {error && (
          <div className="alert alert-error">
            <div className="alert-icon">⚠</div>
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="admin-form">
          <div className="form-group">
            <label>Admin Email</label>
            <input
              type="email"
              className="sleek-input"
              placeholder="admin@decubate.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && (
              <span className="error-text">{errors.email.message as string}</span>
            )}
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="sleek-input"
              placeholder="Enter admin password"
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && (
              <span className="error-text">{errors.password.message as string}</span>
            )}
          </div>
          
          <button
            type="submit"
            className="btn-dark admin-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Authenticating...
              </>
            ) : (
              'Admin Login'
            )}
          </button>
        </form>
      </div>
      
      <style jsx>{`
        .admin-login-card {
          padding: 32px;
          max-width: 400px;
          width: 100%;
        }
        
        .admin-header {
          text-align: center;
          margin-bottom: 24px;
        }
        
        .admin-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }
        
        .admin-header p {
          color: var(--text-secondary);
          font-size: 14px;
          margin: 0;
        }
        
        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .form-group label {
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
        }
        
        .admin-btn {
          width: 100%;
          height: 44px;
          margin-top: 8px;
        }
        
        .error-text {
          color: #F07161;
          font-size: 12px;
        }
      `}</style>
    </>
  );
};

export default AdminLoginForm;