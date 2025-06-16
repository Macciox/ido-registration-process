import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface MarketingKitFormProps {
  projectId: string;
}

interface FormField {
  value: string;
  status: 'Confirmed' | 'Not Confirmed' | 'Might Still Change';
}

interface FormData {
  [key: string]: FormField;
}

const MarketingKitForm: React.FC<MarketingKitFormProps> = ({ projectId }) => {
  const { register, handleSubmit, setValue, watch } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const formValues = watch();
  
  // Fields for this form
  const fields = [
    { id: 'marketingKitUrl', label: 'Marketing Kit URL', type: 'text', placeholder: 'https://drive.google.com/...' },
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
      
      setSuccess('Marketing Kit saved successfully!');
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
        <h2 className="text-lg font-medium">Marketing Kit</h2>
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
        <div className="mb-6">
          <label className="form-label" htmlFor="marketingKitUrl">
            Google Drive Folder URL
          </label>
          <input
            id="marketingKitUrl"
            type="text"
            className="form-input"
            placeholder="https://drive.google.com/..."
            {...register('marketingKitUrl.value')}
          />
          <div className="mt-1 flex items-center space-x-2">
            <select className="text-sm border rounded p-1" {...register('marketingKitUrl.status')}>
              <option value="Not Confirmed">Not Confirmed</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Might Still Change">Might Still Change</option>
            </select>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Please provide a Google Drive folder URL containing all marketing materials.
          </p>
        </div>
        
        <div className="mb-6">
          <p className="form-label">Or Upload Files</p>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    type="file"
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">ZIP, PNG, JPG up to 10MB</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Note: File upload functionality will be implemented in the future with Supabase storage.
          </p>
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

export default MarketingKitForm;