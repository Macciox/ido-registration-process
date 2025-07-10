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
      
      // Load all project owners from projectowner_whitelist table
      const { data: projectOwners, error } = await supabase
        .from('projectowner_whitelist')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
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
      
      // Check if email already in whitelist for another project
      const { data: existingWhitelist } = await supabase
        .from('projectowner_whitelist')
        .select('project_id, projects(name)')
        .eq('email', newEmail.trim())
        .neq('project_id', projectId)
        .single();
      
      if (existingWhitelist) {
        setMessage({ text: `This email is already assigned to another project. Each user can only own one project.`, type: 'error' });
        return;
      }
      // Add project owner to whitelist with pending status
      const { data, error } = await supabase
        .from('projectowner_whitelist')
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
      // Check if new email already in whitelist for another project
      const { data: existingWhitelist } = await supabase
        .from('projectowner_whitelist')
        .select('project_id')
        .eq('email', editEmail.trim())
        .neq('project_id', projectId)
        .single();
      
      if (existingWhitelist) {
        setMessage({ text: `This email is already assigned to another project. Each user can only own one project.`, type: 'error' });
        return;
      }
      
      const { error } = await supabase
        .from('projectowner_whitelist')
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
      const owner = owners.find(o => o.id === ownerId);
      if (!owner) return;
      
      // Note: Primary status not implemented in whitelist yet
      setMessage({ text: 'Primary status feature coming soon', type: 'warning' });
      return;
      
      if (error) throw error;
      
      const action = owner.is_primary ? 'removed from' : 'set as';
      setMessage({ text: `Owner ${action} primary successfully`, type: 'success' });
      loadProjectData(); // Reload to get fresh data
    } catch (err: any) {
      setMessage({ text: `Failed to update primary status: ${err.message}`, type: 'error' });
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
        .from('projectowner_whitelist')
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

  const getStatusBadges = (owner: ProjectOwner) => {
    const badges = [];
    
    // Role badge
    if (owner.is_primary) {
      badges.push(
        <span key="role" className="text-blue-400 text-xs font-medium">
          Primary
        </span>
      );
    }
    
    // Registration status badge
    if (owner.status === 'registered') {
      badges.push(
        <span key="status" className="text-green-400 text-xs font-medium">
          Verified
        </span>
      );
    } else if (owner.status === 'pending_verification') {
      badges.push(
        <span key="status" className="text-orange-400 text-xs font-medium">
          Pending Verification
        </span>
      );
    } else {
      badges.push(
        <span key="status" className="text-yellow-400 text-xs font-medium">
          Not Registered
        </span>
      );
    }
    
    return <div className="flex space-x-1">{badges}</div>;
  };

  return (
    <div className="sleek-card p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-medium text-white">Project Owners</h2>
        <div className="text-xs text-text-muted bg-white/5 p-2 rounded border border-white/10">
          <div><strong>Primary Owner:</strong> Can invite others</div>
          <div><strong>Secondary Owners:</strong> Project access only</div>
        </div>
      </div>
      
      {message && (
        <div className={`alert mb-4 ${
          message.type === 'success' ? 'alert-success' : 
          message.type === 'warning' ? 'alert-warning' :
          'alert-error'
        }`}>
          <div className="alert-icon">{message.type === 'success' ? '✓' : '⚠'}</div>
          <p>
          {message.text}
          </p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="mb-6">
          {owners.length === 0 ? (
            <p className="text-text-muted">No owners found for this project.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {owners.map((owner) => (
                <li key={owner.id} className="py-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3 flex-1">
                      {editingOwner === owner.id ? (
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="sleek-input flex-1 max-w-xs"
                        />
                      ) : (
                        <span className="text-white">{owner.email}</span>
                      )}
                      {getStatusBadges(owner)}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {editingOwner === owner.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(owner.id)}
                            className="btn-light text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="btn-light text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(owner)}
                            className="btn-light text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => togglePrimary(owner.id)}
                            className="btn-light text-xs"
                          >
                            {owner.is_primary ? 'Remove Primary' : 'Make Primary'}
                          </button>
                          <button
                            onClick={() => removeOwner(owner.id)}
                            className="btn-light text-xs"
                            disabled={removingOwnerId === owner.id}
                          >
                            {removingOwnerId === owner.id ? 'Removing...' : 'Remove'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
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
            className="sleek-input flex-1"
            placeholder="Add new owner email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn-dark ml-3"
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