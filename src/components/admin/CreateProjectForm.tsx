import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createProject } from '@/lib/projects';

const CreateProjectForm: React.FC = () => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const onSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { data: project, error } = await createProject(data.name, data.ownerEmail);
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess(`Project "${data.name}" created successfully!`);
        reset();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-6">Create New Project</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="form-label" htmlFor="name">
            Project Name
          </label>
          <input
            id="name"
            type="text"
            className="form-input"
            {...register('name', { required: 'Project name is required' })}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.name.message as string}
            </p>
          )}
        </div>
        
        <div className="mb-6">
          <label className="form-label" htmlFor="ownerEmail">
            Project Owner Email
          </label>
          <input
            id="ownerEmail"
            type="email"
            className="form-input"
            {...register('ownerEmail', { 
              required: 'Project owner email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
          />
          {errors.ownerEmail && (
            <p className="text-red-500 text-sm mt-1">
              {errors.ownerEmail.message as string}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            This email will be used to grant access to the project owner.
          </p>
        </div>
        
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
};

export default CreateProjectForm;