import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProjectOwnersListProps {
  projectId: string;
}

interface ProjectOwner {
  id: string;
  email: string;
  created_at: string;
}

const ProjectOwnersList: React.FC<ProjectOwnersListProps> = ({ projectId }) => {
  const [owners, setOwners] = useState<ProjectOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [addingOwner, setAddingOwner] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    loadProjectOwners();
  }, [projectId]);

  const loadProjectOwners = async () => {
    try {
      setLoading(true);
      
      // First check if the project exists
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('owner_email')
        .eq('id', projectId)
        .single();
      
      if (projectError) {
        console.error('Error loading project:', projectError);
        setOwners([]);
        return;
      }
      
      // Try to get project owners from project_owners table
      const { data, error } = await supabase
        .from('project_owners')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) {
        // If table doesn't exist yet, use the owner_email from projects table
        if (error.code === '42P01') { // undefined_table error
          setOwners([{
            id: 'default',
            email: project.owner_email,
            created_at: new Date().toISOString()
          }]);
        } else {
          throw error;
        }
      } else {
        // If no owners in the table yet, use the owner_email from projects table
        if (!data || data.length === 0) {
          setOwners([{
            id: 'default',
            email: project.owner_email,
            created_at: new Date().toISOString()
          }]);
        } else {
          setOwners(data);
        }
      }
    } catch (err) {
      console.error('Error loading project owners:', err);
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  const addOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail.trim()) {
      setMessage({ text: 'Please enter an email address', type: 'error' });
      return;
    }
    
    try {
      setAddingOwner(true);
      setMessage(null);
      
      // Check if the email is already in the owners list
      if (owners.some(owner => owner.email === newEmail.trim())) {
        setMessage({ text: 'This email is already an owner of this project', type: 'error' });
        return;
      }
      
      // First check if project_owners table exists
      const { count, error: checkError } = await supabase
        .from('project_owners')
        .select('*', { count: 'exact', head: true });
      
      if (checkError && checkError.code === '42P01') {
        // If the table doesn't exist, update the project's owner_email directly
        const { error: updateError } = await supabase
          .from('projects')
          .update({ owner_email: newEmail.trim() })
          .eq('id', projectId);
          
        if (updateError) throw updateError;
        
        // Add the new owner to the local state
        setOwners([{
          id: 'default',
          email: newEmail.trim(),
          created_at: new Date().toISOString()
        }]);
        
        setMessage({ text: 'Project owner updated successfully', type: 'success' });
        setNewEmail('');
        return;
      }
      
      // Add new owner to project_owners table
      const { error } = await supabase
        .from('project_owners')
        .insert([{ 
          project_id: projectId,
          email: newEmail.trim()
        }]);
      
      if (error) {
        throw error;
      }
      
      setMessage({ text: 'Project owner added successfully', type: 'success' });
      setNewEmail('');
      loadProjectOwners();
    } catch (err: any) {
      console.error('Error adding project owner:', err);
      setMessage({ text: err.message || 'Failed to add project owner', type: 'error' });
    } finally {
      setAddingOwner(false);
    }
  };

  const removeOwner = async (ownerId: string) => {
    if (owners.length <= 1) {
      setMessage({ text: 'Cannot remove the last owner', type: 'error' });
      return;
    }
    
    // If this is the default owner (from projects table), don't allow removal
    if (ownerId === 'default') {
      setMessage({ text: 'Cannot remove the primary project owner', type: 'error' });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('project_owners')
        .delete()
        .eq('id', ownerId);
      
      if (error) {
        // If table doesn't exist, show a more helpful error
        if (error.code === '42P01') { // undefined_table error
          throw new Error('Project owners feature is not fully set up. Please run the database migrations.');
        } else {
          throw error;
        }
      }
      
      setMessage({ text: 'Project owner removed successfully', type: 'success' });
      loadProjectOwners();
    } catch (err: any) {
      console.error('Error removing project owner:', err);
      setMessage({ text: err.message || 'Failed to remove project owner', type: 'error' });
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-4">Project Owners</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="mb-6">
          {owners.length === 0 ? (
            <p className="text-gray-500">No owners found for this project.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {owners.map((owner) => (
                <li key={owner.id} className="py-3 flex justify-between items-center">
                  <span className="text-gray-900">{owner.email}</span>
                  <button
                    onClick={() => removeOwner(owner.id)}
                    className="text-red-600 hover:text-red-800"
                    disabled={owners.length <= 1 || owner.id === 'default'}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      <form onSubmit={addOwner} className="mt-4">
        <div className="flex">
          <input
            type="email"
            className="form-input flex-1 rounded-r-none"
            placeholder="Add new owner email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn btn-primary rounded-l-none"
            disabled={addingOwner}
          >
            {addingOwner ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectOwnersList;