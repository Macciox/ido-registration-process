import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

interface ProjectOwnersListProps {
  projectId: string;
}

interface ProjectOwner {
  id: string;
  email: string;
  owner_id?: string;
  status: string;
  created_at: string;
}

const ProjectOwnersList: React.FC<ProjectOwnersListProps> = ({ projectId }) => {
  const [owners, setOwners] = useState<ProjectOwner[]>([]);
  const [primaryOwner, setPrimaryOwner] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [addingOwner, setAddingOwner] = useState(false);
  const [removingOwnerId, setRemovingOwnerId] = useState<string | null>(null);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'warning'} | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      loadProjectData();
    };
    
    init();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      // First get the primary owner from the projects table
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('owner_email, owner_id')
        .eq('id', projectId)
        .single();
      
      if (projectError) {
        console.error('Error loading project:', projectError);
        setMessage({ text: 'Error loading project data', type: 'error' });
        return;
      }
      
      // Store the primary owner email
      setPrimaryOwner(project.owner_email);
      
      // Get the owner's profile information
      const { data: ownerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', project.owner_id)
        .single();
      
      // Create a list of owners starting with the primary owner
      const ownersList: ProjectOwner[] = [{
        id: 'primary',
        email: ownerProfile?.email || project.owner_email,
        owner_id: project.owner_id,
        status: 'primary',
        created_at: new Date().toISOString()
      }];
      
      // Try to get additional owners from the database
      try {
        // First check if the table exists
        const { data: tableCheck, error: tableError } = await supabase
          .from('project_owners')
          .select('count', { count: 'exact', head: true });
        
        // If the table exists, get the owners
        if (!tableError) {
          const { data: additionalOwners, error } = await supabase
            .from('project_owners')
            .select('*, profiles(email)')
            .eq('project_id', projectId);
            
          if (!error && additionalOwners && additionalOwners.length > 0) {
            // Add additional owners to the list
            const formattedOwners = additionalOwners.map(owner => ({
              id: owner.id,
              email: owner.profiles?.email || owner.email,
              owner_id: owner.owner_id,
              status: owner.status || 'pending',
              created_at: owner.created_at
            }));
            
            ownersList.push(...formattedOwners);
          }
        }
      } catch (err) {
        console.log('No additional owners found or table does not exist yet');
      }
      
      setOwners(ownersList);
    } catch (err) {
      console.error('Error loading project data:', err);
      setMessage({ text: 'Failed to load project data', type: 'error' });
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
      if (owners.some(owner => owner.email.toLowerCase() === newEmail.trim().toLowerCase())) {
        setMessage({ text: 'This email is already an owner of this project', type: 'error' });
        return;
      }
      
      // Find the user ID for this email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newEmail.trim())
        .maybeSingle();
      
      const owner_id = userData?.id || null;
      
      // Try to add the owner directly
      const { data, error } = await supabase
        .from('project_owners')
        .insert({
          project_id: projectId,
          email: newEmail.trim(),
          owner_id: owner_id,
          status: owner_id ? 'verified' : 'pending'
        })
        .select();
      
      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          // Add the owner to the local state only
          const newOwner = {
            id: `temp-${Date.now()}`,
            email: newEmail.trim(),
            owner_id: owner_id,
            status: owner_id ? 'verified' : 'pending',
            created_at: new Date().toISOString()
          };
          
          setOwners(prev => [...prev, newOwner]);
          setMessage({ 
            text: 'Owner added locally. Database setup is incomplete. Please contact support.', 
            type: 'warning' 
          });
          setNewEmail('');
          return;
        }
        throw error;
      }
      
      // Add the new owner to the local state
      if (data && data.length > 0) {
        setOwners(prev => [...prev, data[0]]);
        setMessage({ text: 'Project owner added successfully', type: 'success' });
        setNewEmail('');
      }
    } catch (err: any) {
      console.error('Error adding project owner:', err);
      setMessage({ text: `Failed to add project owner: ${err.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setAddingOwner(false);
    }
  };

  const removeOwner = async (ownerId: string) => {
    // Cannot remove the primary owner
    if (ownerId === 'primary') {
      setMessage({ text: 'Cannot remove the primary project owner', type: 'error' });
      return;
    }
    
    try {
      setRemovingOwnerId(ownerId);
      setMessage(null);
      
      // Check if this is a temporary owner (added locally)
      if (ownerId.startsWith('temp-')) {
        // Just remove from local state
        setOwners(prev => prev.filter(owner => owner.id !== ownerId));
        setMessage({ text: 'Project owner removed successfully', type: 'success' });
        return;
      }
      
      // Try to remove from database
      const { error } = await supabase
        .from('project_owners')
        .delete()
        .eq('id', ownerId);
      
      if (error) {
        throw error;
      }
      
      // Remove the owner from the local state
      setOwners(prev => prev.filter(owner => owner.id !== ownerId));
      setMessage({ text: 'Project owner removed successfully', type: 'success' });
    } catch (err: any) {
      console.error('Error removing project owner:', err);
      setMessage({ text: `Failed to remove project owner: ${err.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setRemovingOwnerId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'primary':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Primary</span>;
      case 'verified':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Verified</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-4">Project Owners</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 
          message.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
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
                  {owner.id !== 'primary' && (
                    <button
                      onClick={() => removeOwner(owner.id)}
                      className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
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