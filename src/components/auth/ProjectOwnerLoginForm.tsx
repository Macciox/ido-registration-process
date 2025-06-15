import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { signIn } from '@/lib/auth';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

const ProjectOwnerLoginForm: React.FC = () => {
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
      
      // Check if user has a project
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_email', data.email)
        .single();
      
      if (!project) {
        setError('No project found for this email. Please contact an admin.');
        await supabase.auth.signOut();
        return;
      }
      
      // Redirect to project page
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center">Project Owner Login</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="form-label" htmlFor="owner-email">
            Email
          </label>
          <input
            id="owner-email"
            type="email"
            className="form-input"
            placeholder="project@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">
              {errors.email.message as string}
            </p>
          )}
        </div>
        
        <div className="mb-6">
          <label className="form-label" htmlFor="owner-password">
            Password
          </label>
          <input
            id="owner-password"
            type="password"
            className="form-input"
            {...register('password', { required: 'Password is required' })}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message as string}
            </p>
          )}
        </div>
        
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login as Project Owner'}
        </button>
      </form>
    </div>
  );
};

export default ProjectOwnerLoginForm;