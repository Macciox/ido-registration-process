import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface FormData {
  name: string;
  ownerEmails: string;
  makeFirstPrimary: boolean;
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
          name: data.name
        }])
        .select('id')
        .single();
      
      if (projectError) throw projectError;
      
      // Add all emails to projectowner_whitelist table with pending status
      const projectOwners = emails.map((email, index) => ({
        project_id: projectData.id,
        email,
        status: 'pending',
        is_primary: index === 0 && data.makeFirstPrimary // First email is primary only if checkbox is checked
      }));
      
      const { error: ownersError } = await supabase
        .from('projectowner_whitelist')
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
            placeholder="owner1@example.com, owner2@example.com"
            {...register('ownerEmails', { required: 'At least one owner email is required' })}
          />
          
          <div className="mt-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-primary"
                {...register('makeFirstPrimary')}
                defaultChecked={true}
              />
              <span className="ml-2 text-sm text-gray-700">
                Make first email Primary Owner (can invite others)
              </span>
            </label>
          </div>
          
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-1">📋 Owner Roles:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li><strong>Primary Owner:</strong> Can invite/remove other owners</li>
              <li><strong>Secondary Owner:</strong> Project access only</li>
              <li><strong>Multiple Primary:</strong> You can have multiple primary owners</li>
            </ul>
          </div>
          
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