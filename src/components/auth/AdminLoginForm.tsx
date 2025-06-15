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
      
      console.log('Auth data:', authData);
      
      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData?.user?.id)
        .single();
      
      console.log('Profile query result:', profile);
      console.log('Profile error:', profileError);
      
      if (profileError) {
        console.error('Profile error:', profileError);
        setError('Error checking admin status: ' + profileError.message);
        return;
      }
      
      if (!profile) {
        setError('Profile not found. Please contact support.');
        return;
      }
      
      console.log('Profile role:', profile.role);
      
      if (profile.role !== 'admin') {
        setError('You are not authorized as an admin. Your role is: ' + profile.role);
        await supabase.auth.signOut();
        return;
      }
      
      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center text-primary">Admin Access</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="form-label" htmlFor="admin-email">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <input
              id="admin-email"
              type="email"
              className="form-input pl-10"
              placeholder="admin@decubate.com"
              {...register('email', { required: 'Email is required' })}
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">
              {errors.email.message as string}
            </p>
          )}
        </div>
        
        <div className="mb-6">
          <label className="form-label" htmlFor="admin-password">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              id="admin-password"
              type="password"
              className="form-input pl-10"
              {...register('password', { required: 'Password is required' })}
            />
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message as string}
            </p>
          )}
        </div>
        
        <button
          type="submit"
          className="btn btn-primary w-full flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging in...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-1.243-1.243A6 6 0 1118 8zm-6-4a1 1 0 00-1 1v1.586l-1.293-1.293a1 1 0 00-1.414 1.414L10 8.414l1.707-1.707a1 1 0 00-1.414-1.414L9 6.586V5a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Login as Admin
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AdminLoginForm;