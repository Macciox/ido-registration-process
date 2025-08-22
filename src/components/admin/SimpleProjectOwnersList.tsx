import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SimpleProjectOwnersListProps {
  projectId: string;
}

interface ProjectOwner {
  id: string;
  email: string;
  status: string;
  verified_at: string | null;
}

const SimpleProjectOwnersList: React.FC<SimpleProjectOwnersListProps> = ({ projectId }) => {
  const [owners, setOwners] = useState<ProjectOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');

  // Load project owners
  useEffect(() => {
    if (projectId) {
      loadOwners();
    }
  }, [projectId]);

  const loadOwners = async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get all owners from projectowner_whitelist table
      const { data: allOwners, error: ownersError } = await supabase
        .from('projectowner_whitelist')
        .select('*')
        .eq('project_id', projectId);
      
      if (ownersError) throw ownersError;
      
      if (allOwners) {
        const formattedOwners: ProjectOwner[] = allOwners.map(owner => ({
          id: owner.id,
          email: owner.email,
          status: owner.status,
          verified_at: owner.verified_at
        }));
        
        setOwners(formattedOwners);
      } else {
        setOwners([]);
      }
    } catch (err: any) {
      console.error('Error loading owners:', err);
      setError(err.message || 'Failed to load project owners');
    } finally {
      setLoading(false);
    }
  };

  const addOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    if (!newEmail.trim()) {
      setError('Please enter an email address');
      return;
    }
    
    if (owners.some(owner => owner.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      setError('This email is already an owner of this project');
      return;
    }
    
    try {
      // Add to projectowner_whitelist table
      const { data, error } = await supabase
        .from('projectowner_whitelist')
        .insert({
          project_id: projectId,
          email: newEmail.trim(),
          status: 'pending'
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      // Update local state
      if (data && data.length > 0) {
        setOwners(prev => [...prev, {
          id: data[0].id,
          email: data[0].email,
          status: data[0].status,
          verified_at: null
        }]);
        setMessage('Project owner added to waitlist successfully');
        setNewEmail('');
      }
    } catch (err: any) {
      console.error('Error adding owner:', err);
      setError(err.message || 'Failed to add project owner');
    }
  };

  const startEdit = (owner: ProjectOwner) => {
    setEditingId(owner.id);
    setEditEmail(owner.email);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditEmail('');
  };

  const saveEdit = async (id: string) => {
    if (!editEmail.trim()) {
      setError('Email cannot be empty');
      return;
    }

    if (owners.some(owner => owner.id !== id && owner.email.toLowerCase() === editEmail.trim().toLowerCase())) {
      setError('This email is already an owner of this project');
      return;
    }

    try {
      const { error } = await supabase
        .from('projectowner_whitelist')
        .update({ email: editEmail.trim() })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setOwners(prev => prev.map(owner => 
        owner.id === id ? { ...owner, email: editEmail.trim() } : owner
      ));
      setMessage('Email updated successfully');
      setEditingId(null);
      setEditEmail('');
    } catch (err: any) {
      console.error('Error updating email:', err);
      setError(err.message || 'Failed to update email');
    }
  };

  const getStatusBadge = (owner: ProjectOwner) => {
    if (owner.status === 'registered') {
      return (
        <span className="status-badge status-success">
          Active
        </span>
      );
    } else if (owner.status === 'pending_verification') {
      return (
        <span className="status-badge status-warning">
          Pending Verification
        </span>
      );
    } else {
      return (
        <span className="status-badge status-warning">
          Pending
        </span>
      );
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-100/10 text-red-400 border border-red-400/30">
          {error}
        </div>
      )}
      
      {message && (
        <div className="mb-4 p-3 rounded bg-green-100/10 text-green-400 border border-green-400/30">
          {message}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="sleek-table">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Email</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id}>
                    <td className="text-white">
                      {editingId === owner.id ? (
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="sleek-input flex-1"
                          />
                          <button
                            onClick={() => saveEdit(owner.id)}
                            className="btn-action success"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="btn-action"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        owner.email
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(owner)}
                        {owner.status !== 'registered' && editingId !== owner.id && (
                          <button
                            onClick={() => startEdit(owner)}
                            className="btn-action ml-2"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <form onSubmit={addOwner} className="mt-4">
        <div className="flex gap-2">
          <input
            type="email"
            className="sleek-input flex-1"
            placeholder="Add new team member email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn-dark"
          >
            Invite
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          The user will need to register with this email to access the project.
        </p>
      </form>
    </div>
  );
};

export default SimpleProjectOwnersList;