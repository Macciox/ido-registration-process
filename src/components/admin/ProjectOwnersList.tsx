import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProjectOwnersListProps {
  projectId: string;
}

interface ProjectOwner {
  id: string;
  email: string;
  status?: string;
  verified_at?: string | null;
  created_at: string;
}

const ProjectOwnersList: React.FC<ProjectOwnersListProps> = ({ projectId }) => {
  const [owners, setOwners] = useState<ProjectOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [addingOwner, setAddingOwner] = useState(false);
  const [removingOwnerId, setRemovingOwnerId] = useState<string | null>(null);
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
      
      // Check if the owner email has a verified account
      const { data: authUsers } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', project.owner_email)
        .single();
      
      const primaryOwnerStatus = authUsers ? 'verified' : 'pending';
      
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
            status: primaryOwnerStatus,
            verified_at: primaryOwnerStatus === 'verified' ? new Date().toISOString() : null,
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
            status: primaryOwnerStatus,
            verified_at: primaryOwnerStatus === 'verified' ? new Date().toISOString() : null,
            created_at: new Date().toISOString()
          }]);
        } else {
          // Check verification status for each owner
          const ownersWithStatus = await Promise.all(data.map(async (owner) => {
            if (owner.status) return owner;
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('email', owner.email)
              .single();
            
            return {
              ...owner,
              status: profile ? 'verified' : 'pending',
              verified_at: profile ? new Date().toISOString() : null
            };
          }));
          
          setOwners(ownersWithStatus);
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
      
      // Check if the email has a verified account
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', newEmail.trim())
        .maybeSingle();
      
      const status = profile ? 'verified' : 'pending';
      const verified_at = profile ? new Date().toISOString() : null;
      
      // Create the project_owners table if it doesn't exist
      try {
        await supabase.rpc('create_project_owners_if_not_exists');
      } catch (createError) {
        console.log('Table might already exist or RPC not available:', createError);
      }
      
      // Add new owner to project_owners table
      const { data, error } = await supabase
        .from('project_owners')
        .insert([{ 
          project_id: projectId,
          email: newEmail.trim(),
          status: status || 'pending',
          verified_at: verified_at
        }])
        .select();
      
      if (error) {
        // If the table doesn't exist, update the project's owner_email directly
        if (error.code === '42P01') {
          const { error: updateError } = await supabase
            .from('projects')
            .update({ owner_email: newEmail.trim() })
            .eq('id', projectId);
            
          if (updateError) throw updateError;
          
          // Add the new owner to the local state
          setOwners([{
            id: 'default',
            email: newEmail.trim(),
            status,
            verified_at,
            created_at: new Date().toISOString()
          }]);
          
          setMessage({ text: 'Project owner updated successfully', type: 'success' });
          setNewEmail('');
          return;
        } else {
          throw error;
        }
      }
      
      // Add the new owner to the local state
      if (data && data.length > 0) {
        setOwners([...owners, data[0]]);
      }
      
      setMessage({ text: 'Project owner added successfully', type: 'success' });
      setNewEmail('');
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
      setRemovingOwnerId(ownerId);
      
      // First, check if the table exists
      const { count, error: checkError } = await supabase
        .from('project_owners')
        .select('*', { count: 'exact', head: true });
      
      if (checkError && checkError.code === '42P01') {
        throw new Error('Project owners feature is not fully set up. Please run the database migrations.');
      }
      
      // If we get here, the table exists, so proceed with deletion
      const { error } = await supabase
        .from('project_owners')
        .delete()
        .eq('id', ownerId);
      
      if (error) {
        throw error;
      }
      
      setMessage({ text: 'Project owner removed successfully', type: 'success' });
      // Update the local state to remove the owner
      setOwners(owners.filter(owner => owner.id !== ownerId));
    } catch (err: any) {
      console.error('Error removing project owner:', err);
      setMessage({ text: err.message || 'Failed to remove project owner', type: 'error' });
    } finally {
      setRemovingOwnerId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Verified</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Unknown</span>;
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
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-900">{owner.email}</span>
                    {getStatusBadge(owner.status)}
                  </div>
                  {owner.id !== 'default' && (
                    <button
                      onClick={() => removeOwner(owner.id)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        owners.length <= 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                      disabled={owners.length <= 1}
                    >
                      {removingOwnerId === owner.id ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Removing...
                        </span>
                      ) : 'Remove'}
                    </button>
                  )}
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
            {addingOwner ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </span>
            ) : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectOwnersList;