import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/ui/Toast';

interface PublicRoundFormProps {
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

const PublicRoundForm: React.FC<PublicRoundFormProps> = ({ projectId, onCompletionUpdate }) => {
  const { register, setValue, watch } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const formValues = watch();
  
  // Fields for this form
  const fields = [
    { id: 'whitelistingStartTime', label: 'Whitelisting Opens', type: 'datetime-local', required: true },
    { id: 'idoLaunchDate', label: 'IDO Date', type: 'datetime-local', required: true },
    { id: 'tokenClaimingDate', label: 'Claiming Date', type: 'datetime-local', required: true },
    { id: 'cexDexListingDate', label: 'CEX/DEX Listing Date', type: 'datetime-local', required: true },
    { id: 'allocationUSD', label: 'Allocation in USD', type: 'text', placeholder: 'e.g. $500', required: true },
    { id: 'allocationTokenAmount', label: 'Allocation in Tokens', type: 'text', placeholder: 'e.g. 10,000', required: true },
    { id: 'tokenPrice', label: 'Token Price', type: 'text', placeholder: 'e.g. $0.05', required: true },
    { id: 'tgeUnlockPercentage', label: 'TGE Unlock %', type: 'text', placeholder: 'e.g. 20%', required: true },
    { id: 'cliffLock', label: 'Cliff / Lock', type: 'text', placeholder: 'e.g. 1 month', required: true },
    { id: 'vestingDuration', label: 'Vesting Duration', type: 'text', placeholder: 'e.g. 6 months', required: true },
    { id: 'tokenTicker', label: 'Token Ticker', type: 'text', placeholder: 'e.g. $XYZ', required: true },
    { id: 'network', label: 'Network', type: 'text', placeholder: 'e.g. Ethereum', required: true },
    { id: 'gracePeriod', label: 'Grace Period', type: 'text', placeholder: 'e.g. 24 hours', required: true },
    { id: 'minimumTier', label: 'Minimum Tier', type: 'text', placeholder: 'e.g. Bronze', required: true },
    { id: 'tokenContractAddress', label: 'Token Contract Address', type: 'text', placeholder: 'e.g. 0x...', required: true },
    { id: 'tokenTransferTxId', label: 'Token Transfer TX-ID', type: 'text', placeholder: 'e.g. 0x...', required: false },
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
        } else {
          // Initialize all fields with Not Confirmed status
          fields.forEach(field => {
            setValue(`${field.id}.value`, '');
            setValue(`${field.id}.status`, 'Not Confirmed');
          });
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
    // Filter out optional fields
    const requiredFields = fields.filter(field => field.required);
    const totalFields = requiredFields.length;
    let confirmedFields = 0;
    
    requiredFields.forEach(field => {
      if (data[field.id]?.status === 'Confirmed') {
        confirmedFields++;
      }
    });
    
    const percentage = Math.round((confirmedFields / totalFields) * 100);
    setCompletionPercentage(percentage);
    
    // Update parent component with completion percentage
    if (onCompletionUpdate) {
      onCompletionUpdate('public-round', percentage);
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
        setToast({ message: 'Failed to update status', type: 'error' });
        return;
      }
      
      // Show success message briefly
      setToast({ message: `Status updated to ${status}`, type: 'success' });
      
    } catch (err) {
      console.error('Error:', err);
      setToast({ message: 'An unexpected error occurred', type: 'error' });
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
        <h2 className="text-lg font-medium text-text-primary">Public Round (IDO) | Metrics</h2>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map((field) => (
          <div key={field.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
            <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor={field.id}>
              {field.label}
              {field.required ? '' : ' (Optional)'}
            </label>
            <input
              id={field.id}
              type={field.type}
              className="sleek-input w-full"
              placeholder={field.placeholder}
              {...register(`${field.id}.value`)}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex space-x-2">
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
          </div>
        ))}
      </div>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default PublicRoundForm;