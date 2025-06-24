import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

interface ProjectOwnersListProps {
  projectId: string;
}

interface ProjectOwner {
  id: string;
  email: string;
  owner_id: string | null;
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
  const [verifiedOwners, setVerifiedOwners] = useState<Record<string, boolean>>({});

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
      // Get the project with owner information
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('owner_id, owner_email')
        .eq('id', projectId)
        .single();
      if (projectError) {
        console.error('Error loading project:', projectError);
        setMessage({ text: 'Error loading project data', type: 'error' });
        return;
      }
      // Get the owner's profile information
      let ownerEmail = project.owner_email;
      if (project.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', project.owner_id)
          .single();
        if (ownerProfile) {
          ownerEmail = ownerProfile.email;
        }
      }
      // Create a list of owners starting with the primary owner
      const ownersList: ProjectOwner[] = [{
        id: 'primary',
        email: ownerEmail,
        owner_id: project.owner_id,
        status: 'primary',
        created_at: new Date().toISOString()
      }];
      // Store the primary owner ID
      setPrimaryOwner(project.owner_id);
      // Try to get additional owners from the database
      let allOwnerEmails = [ownerEmail];
      try {
        // First check if the table exists
        const { data: tableCheck, error: tableError } = await supabase
          .from('project_owners')
          .select('count', { count: 'exact', head: true });
        // If the table exists, get the owners
        if (!tableError) {
          const { data: additionalOwners, error } = await supabase
            .from('project_owners')
            .select('*, profiles:owner_id(email)')
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
            allOwnerEmails = [ownerEmail, ...formattedOwners.map(o => o.email)];
          }
        }
      } catch (err) {
        console.log('No additional owners found or table does not exist yet');
      }
      setOwners(ownersList);
      // Verifica per ogni owner se è registrato
      if (allOwnerEmails.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('email');
        if (profilesError) {
          setVerifiedOwners({});
        } else {
          const verified: Record<string, boolean> = {};
          allOwnerEmails.forEach(email => {
            verified[email] = profiles.some((p: any) => p.email === email);
          });
          setVerifiedOwners(verified);
        }
      } else {
        setVerifiedOwners({});
      }
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
      // Add project owner with pending status
      const { data, error } = await supabase
        .from('project_owners')
        .insert({
          project_id: projectId,
          email: newEmail.trim(),
          status: 'pending'
        })
        .select();
      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          const newOwner = {
            id: `temp-${Date.now()}`,
            email: newEmail.trim(),
            owner_id: null,
            status: 'pending',
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

  const getStatusBadge = (status: string, email: string) => {
    if (status === 'primary') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Primary</span>;
    }
    if (status === 'registered') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Registered</span>;
    }
    if (status === 'pending_verification') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Pending Verification</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Not Registered</span>;
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
                    {getStatusBadge(owner.status, owner.email)}
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