// Default status for all form fields
export const DEFAULT_FIELD_STATUS = 'Not Confirmed';

// Helper function to set initial field status for all form fields
export const initializeFormFields = async (supabase: any, projectId: string, fields: string[]) => {
  try {
    // Check which fields already exist
    const { data: existingFields } = await supabase
      .from('project_fields')
      .select('field_name')
      .eq('project_id', projectId)
      .in('field_name', fields);
    
    const existingFieldNames = existingFields?.map((f: any) => f.field_name) || [];
    
    // Create fields that don't exist yet
    const fieldsToCreate = fields.filter(field => !existingFieldNames.includes(field));
    
    if (fieldsToCreate.length > 0) {
      const fieldsToInsert = fieldsToCreate.map(field => ({
        project_id: projectId,
        field_name: field,
        field_value: '',
        status: DEFAULT_FIELD_STATUS
      }));
      
      await supabase
        .from('project_fields')
        .insert(fieldsToInsert);
    }
    
    return true;
  } catch (err) {
    console.error('Error initializing form fields:', err);
    return false;
  }
};