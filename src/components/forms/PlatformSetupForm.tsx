import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

interface PlatformSetupFormProps {
  projectId: string;
  onCompletionUpdate?: (tabId: string, percentage: number) => void;
}

interface FormField {
  value: string;
  status: 'Confirmed' | 'Not Confirmed' | 'Might Still Change';
}

interface FormData {
  [key: string]: FormField;
}

const PlatformSetupForm: React.FC<PlatformSetupFormProps> = ({ projectId, onCompletionUpdate }) => {
  const { register, setValue, watch } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const formValues = watch();
  const { showToast } = useToast();
  
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
    
    // Update parent component with completion percentage
    if (onCompletionUpdate) {
      onCompletionUpdate('platform-setup', percentage);
    }
  };
  
  const handleStatusChange = async (fieldId: string, status: string) => {
    try {
      setLoading(true);
      
      // Update the field in the database
      const { error } = await supabase
        .from('project_fields')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('field_name', fieldId);
      
      if (error) {
        console.error('Error updating field status:', error);
        showToast('Failed to update status', 'error');
        return;
      }
      
      // Show toast notification
      showToast(`Status updated to ${status}`, 'success');
      
    } catch (err) {
      console.error('Error:', err);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleValueChange = async (fieldId: string, value: string) => {
    try {
      // Check if field exists
      const { data: existingField } = await supabase
        .from('project_fields')
        .select('*')
        .eq('project_id', projectId)
        .eq('field_name', fieldId)
        .single();
      
      if (existingField) {
        // Update existing field
        await supabase
          .from('project_fields')
          .update({ 
            field_value: value,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingField.id);
      } else {
        // Create new field
        await supabase
          .from('project_fields')
          .insert([{ 
            project_id: projectId, 
            field_name: fieldId, 
            field_value: value, 
            status: 'Not Confirmed' 
          }]);
      }
    } catch (err) {
      console.error('Error saving field value:', err);
    }
  };

  return (
    <div className="sleek-card p-6 form-container">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-text-primary">Platform Setup</h2>
        <div className="flex items-center">
          <div className="mr-3 text-sm font-medium text-text-primary">
            Completion: {completionPercentage}%
          </div>
          <div className="progress-bar w-32">
            <div 
              className="progress-fill" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-error mb-4">
          <div className="alert-icon">⚠</div>
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6">
        {fields.map((field) => (
          <div key={field.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
            <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor={field.id}>
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.id}
                rows={4}
                className="sleek-input w-full"
                placeholder={field.placeholder}
                {...register(`${field.id}.value`)}
                onChange={(e) => handleValueChange(field.id, e.target.value)}
              />
            ) : (
              <input
                id={field.id}
                type={field.type}
                className="sleek-input w-full"
                placeholder={field.placeholder}
                {...register(`${field.id}.value`)}
                onChange={(e) => handleValueChange(field.id, e.target.value)}
              />
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {['Not Confirmed', 'Might Still Change', 'Confirmed'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    formValues[field.id]?.status === status
                      ? status === 'Confirmed' 
                        ? 'bg-secondary text-white' 
                        : status === 'Might Still Change'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-500 text-white'
                      : 'bg-white/10 text-text-secondary hover:bg-white/20 hover:text-text-primary'
                  }`}
                  onClick={() => {
                    setValue(`${field.id}.status`, status as any);
                    handleStatusChange(field.id, status);
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformSetupForm;