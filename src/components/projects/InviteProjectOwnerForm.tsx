import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface FormData {
  email: string;
  isPrimary: boolean;
}

interface InviteProjectOwnerFormProps {
  projectId: string;
  projectName: string;
  onSuccess?: () => void;
}

const InviteProjectOwnerForm: React.FC<InviteProjectOwnerFormProps> = ({ 
  projectId, 
  projectName,
  onSuccess 
}) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Check if email already exists in projectowner_whitelist for this project
      const { data: existingOwner, error: checkError } = await supabase
        .from('projectowner_whitelist')
        .select('*')
        .eq('project_id', projectId)
        .eq('email', data.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw checkError;
      }

      if (existingOwner) {
        throw new Error('This email is already associated with this project');
      }

      // Add email to projectowner_whitelist table with pending status
      const { error: ownerError } = await supabase
        .from('projectowner_whitelist')
        .insert([{
          project_id: projectId,
          email: data.email,
          status: 'pending'
        }]);
      
      if (ownerError) throw ownerError;

      // Send invitation email through serverless function
      const { error: inviteError } = await supabase.functions.invoke('send-project-invites', {
        body: { 
          projectId,
          projectName,
          invites: [{
            email: data.email,
            isPrimary: data.isPrimary
          }]
        }
      });

      if (inviteError) {
        console.error('Error sending invite:', inviteError);
        setMessage({ 
          text: 'Owner added but there was an error sending the invitation. Please try resending it.',
          type: 'error'
        });
        return;
      }
      
      setMessage({ 
        text: 'Invitation sent successfully',
        type: 'success'
      });
      reset();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error inviting owner:', err);
      setMessage({ text: err.message || 'Failed to invite owner', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium mb-6">Invite Project Owner</h3>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="form-label" htmlFor="owner-email">
            Email Address
          </label>
          <input
            id="owner-email"
            type="email"
            className="form-input"
            placeholder="owner@example.com"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            })}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">
              {errors.email.message}
            </p>
          )}
        </div>
        
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-primary"
              {...register('isPrimary')}
            />
            <span className="ml-2 text-sm text-gray-700">
              Make Primary Owner (can invite others)
            </span>
          </label>
        </div>
        
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Sending Invitation...' : 'Send Invitation'}
        </button>
      </form>
    </div>
  );
};

export default InviteProjectOwnerForm;