import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface FormData {
  name: string;
  ownerEmails: string;
}

const CreateProjectForm: React.FC = () => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Parse emails (comma or newline separated)
      const emails = data.ownerEmails
        .split(/[\s,]+/)
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      if (emails.length === 0) {
        setMessage({ text: 'Please enter at least one owner email', type: 'error' });
        setLoading(false);
        return;
      }
      
      // Create the project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{ 
          name: data.name,
          owner_email: emails[0] // Keep the first email as the primary for backward compatibility
        }])
        .select('id')
        .single();
      
      if (projectError) throw projectError;
      
      // Add all emails to project_owners table
      const projectOwners = emails.map(email => ({
        project_id: projectData.id,
        email
      }));
      
      const { error: ownersError } = await supabase
        .from('project_owners')
        .insert(projectOwners);
      
      if (ownersError) throw ownersError;
      
      setMessage({ text: 'Project created successfully', type: 'success' });
      reset(); // Clear the form
    } catch (err: any) {
      console.error('Error creating project:', err);
      setMessage({ text: err.message || 'Failed to create project', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-6">Create New Project</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="form-label" htmlFor="project-name">
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            className="form-input"
            placeholder="Enter project name"
            {...register('name', { required: 'Project name is required' })}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.name.message}
            </p>
          )}
        </div>
        
        <div className="mb-6">
          <label className="form-label" htmlFor="owner-emails">
            Project Owner Emails
          </label>
          <textarea
            id="owner-emails"
            rows={4}
            className="form-input"
            placeholder="Enter email addresses (comma or line separated)"
            {...register('ownerEmails', { required: 'At least one owner email is required' })}
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter multiple emails separated by commas or new lines
          </p>
          {errors.ownerEmails && (
            <p className="text-red-500 text-sm mt-1">
              {errors.ownerEmails.message}
            </p>
          )}
        </div>
        
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
};

export default CreateProjectForm;