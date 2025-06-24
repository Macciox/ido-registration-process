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
  is_primary?: boolean;
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
  const [editingOwner, setEditingOwner] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');

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
      
      // Load all project owners directly from project_owners table
      const { data: projectOwners, error } = await supabase
        .from('project_owners')
        .select('*')
        .eq('project_id', projectId)
        .order('is_primary', { ascending: false });
      
      if (error) {
        console.error('Error loading project owners:', error);
        setMessage({ text: 'Error loading project owners', type: 'error' });
        return;
      }
      
      setOwners(projectOwners || []);
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

  const startEdit = (owner: ProjectOwner) => {
    setEditingOwner(owner.id);
    setEditEmail(owner.email);
  };

  const cancelEdit = () => {
    setEditingOwner(null);
    setEditEmail('');
  };

  const saveEdit = async (ownerId: string) => {
    try {
      const { error } = await supabase
        .from('project_owners')
        .update({ email: editEmail.trim() })
        .eq('id', ownerId);
      
      if (error) throw error;
      
      setOwners(prev => prev.map(owner => 
        owner.id === ownerId ? { ...owner, email: editEmail.trim() } : owner
      ));
      
      setMessage({ text: 'Email updated successfully', type: 'success' });
      cancelEdit();
      loadProjectData(); // Reload to get fresh data
    } catch (err: any) {
      setMessage({ text: `Failed to update email: ${err.message}`, type: 'error' });
    }
  };

  const togglePrimary = async (ownerId: string) => {
    try {
      // First, set all owners to non-primary
      await supabase
        .from('project_owners')
        .update({ is_primary: false })
        .eq('project_id', projectId);
      
      // Then set the selected owner as primary
      const { error } = await supabase
        .from('project_owners')
        .update({ is_primary: true })
        .eq('id', ownerId);
      
      if (error) throw error;
      
      setMessage({ text: 'Primary owner updated successfully', type: 'success' });
      loadProjectData(); // Reload to get fresh data
    } catch (err: any) {
      setMessage({ text: `Failed to update primary owner: ${err.message}`, type: 'error' });
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

  const getStatusBadge = (owner: ProjectOwner) => {
    if (owner.is_primary) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Primary Owner</span>;
    }
    if (owner.status === 'registered') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Registered</span>;
    }
    if (owner.status === 'pending_verification') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Pending Verification</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Not Registered</span>;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-medium">Project Owners</h2>
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <div><strong>Primary Owner:</strong> Can invite others</div>
          <div><strong>Secondary Owners:</strong> Project access only</div>
        </div>
      </div>
      
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
                <li key={owner.id} className="py-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3 flex-1">
                      {editingOwner === owner.id ? (
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="form-input flex-1 max-w-xs"
                        />
                      ) : (
                        <span className="text-gray-900">{owner.email}</span>
                      )}
                      {getStatusBadge(owner)}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {editingOwner === owner.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(owner.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(owner)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          {!owner.is_primary && (
                            <button
                              onClick={() => togglePrimary(owner.id)}
                              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                            >
                              Make Primary
                            </button>
                          )}
                          <button
                            onClick={() => removeOwner(owner.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            disabled={removingOwnerId === owner.id}
                          >
                            {removingOwnerId === owner.id ? 'Removing...' : 'Remove'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))
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