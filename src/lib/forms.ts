// Helper function to set initial status for all form fields
export const setInitialFieldStatus = (fields: any[], existingData: any) => {
  const fieldData: any = {};
  
  fields.forEach(field => {
    if (existingData && existingData[field.id]) {
      fieldData[field.id] = {
        value: existingData[field.id].value || '',
        status: existingData[field.id].status
      };
    } else {
      fieldData[field.id] = {
        value: '',
        status: 'Not Confirmed'
      };
    }
  });
  
  return fieldData;
};

// Helper function to create or update a field in the database
export const saveFieldToDatabase = async (supabase: any, projectId: string, fieldId: string, value: string, status: string = 'Not Confirmed') => {
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
      return await supabase
        .from('project_fields')
        .update({ 
          field_value: value,
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingField.id);
    } else {
      // Create new field
      return await supabase
        .from('project_fields')
        .insert([{ 
          project_id: projectId, 
          field_name: fieldId, 
          field_value: value, 
          status: status
        }]);
    }
  } catch (err) {
    console.error('Error saving field:', err);
    throw err;
  }
};