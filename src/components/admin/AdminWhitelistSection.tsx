import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminWhitelistEntry {
  id: string;
  email: string;
  status?: string;
  created_at: string;
}

const AdminWhitelistSection: React.FC = () => {
  const [whitelist, setWhitelist] = useState<AdminWhitelistEntry[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadWhitelist();
  }, []);

  const loadWhitelist = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_whitelist')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      console.log('Loaded whitelist:', data);
      setWhitelist(data || []);
    } catch (err: any) {
      console.error('Error loading whitelist:', err);
      setError(err.message || 'Failed to load admin whitelist');
    } finally {
      setLoading(false);
    }
  };

  const addEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!newEmail.trim()) {
      setError('Please enter an email address');
      return;
    }
    if (whitelist.some(entry => entry.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      setError('This email is already in the whitelist');
      return;
    }
    try {
      // Always add to whitelist with status 'pending'
      const { error } = await supabase
        .from('admin_whitelist')
        .insert({ 
          email: newEmail.trim(),
          status: 'pending'
        });
      if (error) throw error;
      setMessage('Admin email added to whitelist');
      setNewEmail('');
      loadWhitelist();
    } catch (err: any) {
      console.error('Error adding email:', err);
      setError(err.message || 'Failed to add email to whitelist');
    }
  };

  const removeEmail = async (id: string) => {
    setError(null);
    setMessage(null);
    setRemovingId(id);
    
    try {
      console.log('Removing email with ID:', id);
      
      // Get the entry before deleting it (for logging)
      const { data: entryToRemove } = await supabase
        .from('admin_whitelist')
        .select('*')
        .eq('id', id)
        .single();
        
      console.log('Entry to remove:', entryToRemove);
      
      // Delete the entry
      const { error, count } = await supabase
        .from('admin_whitelist')
        .delete()
        .eq('id', id);
      
      console.log('Delete result:', { error, count });
      
      if (error) throw error;
      
      // Update local state immediately
      setWhitelist(prev => prev.filter(entry => entry.id !== id));
      setMessage('Admin email removed from whitelist');
      
      // Reload the list to confirm changes
      loadWhitelist();
    } catch (err: any) {
      console.error('Error removing email:', err);
      setError(err.message || 'Failed to remove email from whitelist');
    } finally {
      setRemovingId(null);
    }
  };

  const getStatusBadge = (entry: AdminWhitelistEntry) => {
    if (entry.status === 'registered') {
      return (
        <span className="text-green-400 text-sm font-medium">
          Registered
        </span>
      );
    } else if (entry.status === 'pending_verification') {
      return (
        <span className="text-orange-400 text-sm font-medium">
          Pending Verification
        </span>
      );
    } else {
      return (
        <span className="text-yellow-400 text-sm font-medium">
          Not Registered
        </span>
      );
    }
  };

  return (
    <div className="sleek-card p-6 mb-6">
      <h2 className="text-lg font-medium text-white mb-4">Admin Whitelist</h2>
      {error && (
        <div className="p-4 mb-4 rounded bg-red-900/20 text-red-400 border border-red-500/30">{error}</div>
      )}
      {message && (
        <div className="p-4 mb-4 rounded bg-green-900/20 text-green-400 border border-green-500/30">{message}</div>
      )}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="mb-6">
          <ul className="divide-y divide-white/10">
            {whitelist.map(entry => (
              <li key={entry.id} className="py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-white">{entry.email}</span>
                  {getStatusBadge(entry)}
                </div>
                <button
                  onClick={() => removeEmail(entry.id)}
                  className="btn-light text-sm"
                  disabled={removingId === entry.id}
                >
                  {removingId === entry.id ? 'Removing...' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={addEmail} className="mt-4">
        <div className="flex gap-3">
          <input
            type="email"
            className="sleek-input flex-1"
            placeholder="Add admin email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn-light"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminWhitelistSection;