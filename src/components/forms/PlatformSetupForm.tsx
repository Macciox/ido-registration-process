import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface PlatformSetupFormProps {
  projectId: string;
}

interface FormField {
  value: string;
  status: 'Confirmed' | 'Not Confirmed' | 'Might Still Change';
}

interface FormData {
  [key: string]: FormField;
}

const PlatformSetupForm: React.FC<PlatformSetupFormProps> = ({ projectId }) => {
  const { register, handleSubmit, setValue, watch } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const formValues = watch();
  
  // Fields for this form
  const fields = [
    { id: 'tagline', label: 'Tagline / Subtitle', type: 'text', placeholder: 'Brief project tagline' },
    { id: 'projectDescription', label: 'Short Project Description', type: 'textarea', placeholder: 'Detailed project description' },
    { id: 'telegram', label: 'Telegram', type: 'text', placeholder: 'https://t.me/...' },
    { id: 'twitter', label: 'Twitter', type: 'text', placeholder: 'https://twitter.com/...' },
    { id: 'discord', label: 'Discord', type: 'text', placeholder: 'https://discord.gg/...' },
    { id: 'youtube', label: 'YouTube', type: 'text', placeholder: 'https://youtube.com/...' },
    { id: 'linkedin', label: 'LinkedIn', type: 'text', placeholder: 'https://linkedin.com/...' },
    { id: 'tokenomicsFile', label: 'Public Tokenomics File', type: 'text', placeholder: 'https://...' },
    { id: 'teamPage', label: 'Team Page Link', type: 'text', placeholder: 'https://...' },
    { id: 'roadmapPage', label: 'Roadmap Page Link', type: 'text', placeholder: 'https://...' },
  ];
  
  // Load existing data
  useEffect(() => {
    const loadProjectFields = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('project_fields')
          .select('*')
          .eq('project_id', projectId)
          .in('field_name', fields.map(f => f.id));
        
        if (error) {
          console.error('Error loading project fields:', error);
          return;
        }
        
        if (data && data.length > 0) {
          // Group fields by field_name
          const fieldData: FormData = {};
          
          data.forEach(field => {
            fieldData[field.field_name] = {
              value: field.field_value || '',
              status: field.status as 'Confirmed' | 'Not Confirmed' | 'Might Still Change'
            };
          });
          
          // Set form values
          fields.forEach(field => {
            if (fieldData[field.id]) {
              setValue(`${field.id}.value`, fieldData[field.id].value);
              setValue(`${field.id}.status`, fieldData[field.id].status);
            } else {
              setValue(`${field.id}.value`, '');
              setValue(`${field.id}.status`, 'Not Confirmed');
            }
          });
          
          // Calculate completion percentage
          calculateCompletionPercentage(fieldData);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (projectId) {
      loadProjectFields();
    }
  }, [projectId, setValue]);
  
  // Calculate completion percentage
  useEffect(() => {
    if (Object.keys(formValues).length > 0) {
      calculateCompletionPercentage(formValues);
    }
  }, [formValues]);
  
  const calculateCompletionPercentage = (data: FormData) => {
    const totalFields = fields.length;
    let confirmedFields = 0;
    
    fields.forEach(field => {
      if (data[field.id]?.status === 'Confirmed') {
        confirmedFields++;
      }
    });
    
    const percentage = Math.round((confirmedFields / totalFields) * 100);
    setCompletionPercentage(percentage);
  };
  
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare data for saving
      const fieldsToSave = fields.map(field => ({
        project_id: projectId,
        field_name: field.id,
        field_value: data[field.id]?.value || '',
        status: data[field.id]?.status || 'Not Confirmed'
      }));
      
      // Delete existing fields first
      await supabase
        .from('project_fields')
        .delete()
        .eq('project_id', projectId)
        .in('field_name', fields.map(f => f.id));
      
      // Insert new fields
      const { error } = await supabase
        .from('project_fields')
        .insert(fieldsToSave);
      
      if (error) {
        setError(error.message);
        return;
      }
      
      setSuccess('Platform Setup saved successfully!');
    } catch (err) {
      console.error('Error saving data:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Platform Setup</h2>
        <div className="flex items-center">
          <div className="mr-3 text-sm font-medium">
            Completion: {completionPercentage}%
          </div>
          <div className="w-32 bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-primary h-2.5 rounded-full" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      
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
        <div className="grid grid-cols-1 gap-6">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="form-label" htmlFor={field.id}>
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.id}
                  rows={4}
                  className="form-input"
                  placeholder={field.placeholder}
                  {...register(`${field.id}.value`)}
                />
              ) : (
                <input
                  id={field.id}
                  type={field.type}
                  className="form-input"
                  placeholder={field.placeholder}
                  {...register(`${field.id}.value`)}
                />
              )}
              <div className="mt-1 flex items-center space-x-2">
                <select 
                  className="text-sm border rounded p-1" 
                  {...register(`${field.id}.status`)}
                >
                  <option value="Not Confirmed">Not Confirmed</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Might Still Change">Might Still Change</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlatformSetupForm;