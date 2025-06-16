import { supabase } from './supabase';

export interface MediaKit {
  id: string;
  project_id: string | null;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  banner_image_url: string;
  button_style: string;
}

/**
 * Get media kit for a specific project or the default one
 */
export async function getMediaKit(projectId?: string): Promise<MediaKit | null> {
  try {
    // First try to get project-specific media kit
    if (projectId) {
      const { data: projectKit, error: projectError } = await supabase
        .from('media_kit')
        .select('*')
        .eq('project_id', projectId)
        .single();
      
      if (!projectError && projectKit) {
        return projectKit;
      }
    }
    
    // Fall back to default media kit
    const { data: defaultKit, error: defaultError } = await supabase
      .from('media_kit')
      .select('*')
      .is('project_id', null)
      .single();
    
    if (defaultError) {
      console.error('Error fetching default media kit:', defaultError);
      return null;
    }
    
    return defaultKit;
  } catch (err) {
    console.error('Error in getMediaKit:', err);
    return null;
  }
}

/**
 * Update media kit for a specific project
 */
export async function updateMediaKit(
  projectId: string, 
  mediaKitData: Partial<Omit<MediaKit, 'id' | 'project_id'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if project-specific media kit exists
    const { data: existingKit } = await supabase
      .from('media_kit')
      .select('id')
      .eq('project_id', projectId)
      .single();
    
    if (existingKit) {
      // Update existing media kit
      const { error } = await supabase
        .from('media_kit')
        .update({
          ...mediaKitData,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId);
      
      if (error) throw error;
    } else {
      // Create new media kit for this project
      const { error } = await supabase
        .from('media_kit')
        .insert([{
          project_id: projectId,
          ...mediaKitData
        }]);
      
      if (error) throw error;
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating media kit:', err);
    return { 
      success: false, 
      error: err.message || 'Failed to update media kit'
    };
  }
}