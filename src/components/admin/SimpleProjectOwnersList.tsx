import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SimpleProjectOwnersListProps {
  projectId: string;
}

const SimpleProjectOwnersList: React.FC<SimpleProjectOwnersListProps> = ({ projectId }) => {
  const [owners, setOwners] = useState<string[]>([]);
  const [primaryOwner, setPrimaryOwner] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifiedOwners, setVerifiedOwners] = useState<Record<string, boolean>>({});

  // Load project owners
  useEffect(() => {
    loadOwners();
  }, [projectId]);

  const loadOwners = async () => {
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
      // Get additional owners
      const { data: additionalOwners, error: ownersError } = await supabase
        .from('project_owners')
        .select('email')
        .eq('project_id', projectId);
      let allOwners: string[] = [];
      if (ownersError && ownersError.code === '42P01') {
        allOwners = [project.owner_email];
        setOwners(allOwners);
      } else if (ownersError) {
        throw ownersError;
      } else {
        const ownerEmails = additionalOwners?.map(owner => owner.email) || [];
        allOwners = [project.owner_email, ...ownerEmails];
        setOwners(allOwners);
      }
      // Verifica per ogni owner se è registrato
      if (allOwners.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('email');
        if (profilesError) {
          setVerifiedOwners({});
        } else {
          const verified: Record<string, boolean> = {};
          allOwners.forEach(email => {
            verified[email] = profiles.some((p: any) => p.email === email);
          });
          setVerifiedOwners(verified);
        }
      } else {
        setVerifiedOwners({});
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
    
    if (owners.includes(newEmail.trim())) {
      setError('This email is already an owner of this project');
      return;
    }
    
    try {
      // We can't create tables from the frontend, so we'll just try to use it
      // If the table doesn't exist, we'll handle the error later
      
      // Add the owner
      const { error } = await supabase
        .from('project_owners')
        .insert({
          project_id: projectId,
          email: newEmail.trim()
        });
      
      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          setError('Database setup is incomplete. Please contact support.');
        } else {
          throw error;
        }
        return;
      }
      
      // Update local state
      setOwners(prev => [...prev, newEmail.trim()]);
      setMessage('Project owner added successfully');
      setNewEmail('');
    } catch (err: any) {
      console.error('Error adding owner:', err);
      if (err.code && err.message) {
        setError(`Errore Supabase [${err.code}]: ${err.message}`);
      } else {
        setError(err.message || 'Failed to add project owner');
      }
    }
  };

  const removeOwner = async (email: string) => {
    if (email === primaryOwner) {
      setError('Cannot remove the primary project owner');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('project_owners')
        .delete()
        .eq('project_id', projectId)
        .eq('email', email);
      
      if (error) throw error;
      
      // Update local state
      setOwners(prev => prev.filter(e => e !== email));
      setMessage('Project owner removed successfully');
    } catch (err: any) {
      console.error('Error removing owner:', err);
      setError(err.message || 'Failed to remove project owner');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-4">Project Owners</h2>
      
      {error && (
        <div className="p-4 mb-4 rounded bg-red-100 text-red-700">
          {error}
        </div>
      )}
      
      {message && (
        <div className="p-4 mb-4 rounded bg-green-100 text-green-700">
          {message}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="mb-6">
          <ul className="divide-y divide-gray-200">
            {owners.map((email) => (
              <li key={email} className="py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-900">{email}</span>
                  {email === primaryOwner && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      Primary
                    </span>
                  )}
                  {verifiedOwners[email] === true && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Verificato
                    </span>
                  )}
                  {verifiedOwners[email] === false && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      Non registrato
                    </span>
                  )}
                </div>
                {email !== primaryOwner && (
                  <button
                    onClick={() => removeOwner(email)}
                    className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
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
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
};

export default SimpleProjectOwnersList;