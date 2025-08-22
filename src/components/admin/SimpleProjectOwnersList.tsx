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
  const [primaryOwner, setPrimaryOwner] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      // Get primary owner
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('owner_email')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      
      setPrimaryOwner(project.owner_email);
      
      // Get additional owners from projectowner_whitelist table
      try {
        const { data: additionalOwners, error: ownersError } = await supabase
          .from('projectowner_whitelist')
          .select('*')
          .eq('project_id', projectId);
        
        if (!ownersError && additionalOwners) {
          // Filter out duplicates and format owners with primary owner first
          const uniqueAdditionalOwners = additionalOwners.filter(
            owner => owner.email.toLowerCase() !== project.owner_email.toLowerCase()
          );
          
          const formattedOwners: ProjectOwner[] = [
            {
              id: 'primary',
              email: project.owner_email,
              status: 'primary',
              verified_at: null
            },
            ...uniqueAdditionalOwners.map(owner => ({
              id: owner.id,
              email: owner.email,
              status: owner.status,
              verified_at: null
            }))
          ];
          
          setOwners(formattedOwners);
        } else {
          setOwners([{
            id: 'primary',
            email: project.owner_email,
            status: 'primary',
            verified_at: null
          }]);
        }
      } catch (err) {
        console.log('Error loading additional owners, using only primary owner');
        setOwners([{
          id: 'primary',
          email: project.owner_email,
          status: 'primary',
          verified_at: null
        }]);
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

  const removeOwner = async (id: string) => {
    if (id === 'primary') {
      setError('Cannot remove the primary project owner');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('projectowner_whitelist')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setOwners(prev => prev.filter(owner => owner.id !== id));
      setMessage('Project owner removed successfully');
    } catch (err: any) {
      console.error('Error removing owner:', err);
      setError(err.message || 'Failed to remove project owner');
    }
  };

  const getStatusBadge = (owner: ProjectOwner) => {
    if (owner.status === 'primary') {
      return (
        <span className="status-badge status-success">
          Primary
        </span>
      );
    } else if (owner.status === 'registered') {
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
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id}>
                    <td className="text-white">{owner.email}</td>
                    <td>{getStatusBadge(owner)}</td>
                    <td>
                      {owner.id !== 'primary' && (
                        <button
                          onClick={() => removeOwner(owner.id)}
                          className="btn-action danger"
                        >
                          Remove
                        </button>
                      )}
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