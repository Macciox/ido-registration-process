import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminWhitelistEntry {
  id: string;
  email: string;
  created_at: string;
}

const AdminWhitelistSection: React.FC = () => {
  const [whitelist, setWhitelist] = useState<AdminWhitelistEntry[]>([]);
  const [verifiedAdmins, setVerifiedAdmins] = useState<Record<string, boolean>>({});
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setWhitelist(data || []);
      // Verifica per ogni email se è registrata
      if (data && data.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('email');
        if (profilesError) {
          setVerifiedAdmins({});
        } else {
          const verified: Record<string, boolean> = {};
          data.forEach(entry => {
            verified[entry.email] = profiles.some((p: any) => p.email === entry.email);
          });
          setVerifiedAdmins(verified);
        }
      } else {
        setVerifiedAdmins({});
      }
    } catch (err: any) {
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
      const { error } = await supabase
        .from('admin_whitelist')
        .insert({ email: newEmail.trim() });
      if (error) throw error;
      setMessage('Admin email added to whitelist');
      setNewEmail('');
      loadWhitelist();
    } catch (err: any) {
      setError(err.message || 'Failed to add email to whitelist');
    }
  };

  const removeEmail = async (id: string) => {
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('admin_whitelist')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setMessage('Admin email removed from whitelist');
      loadWhitelist();
    } catch (err: any) {
      setError(err.message || 'Failed to remove email from whitelist');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-medium mb-4">Admin Whitelist</h2>
      {error && (
        <div className="p-4 mb-4 rounded bg-red-100 text-red-700">{error}</div>
      )}
      {message && (
        <div className="p-4 mb-4 rounded bg-green-100 text-green-700">{message}</div>
      )}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="mb-6">
          <ul className="divide-y divide-gray-200">
            {whitelist.map(entry => (
              <li key={entry.id} className="py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-900">{entry.email}</span>
                  {verifiedAdmins[entry.email] === true && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Verified</span>
                  )}
                  {verifiedAdmins[entry.email] === false && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Not Registered</span>
                  )}
                </div>
                <button
                  onClick={() => removeEmail(entry.id)}
                  className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={addEmail} className="mt-4">
        <div className="flex">
          <input
            type="email"
            className="form-input flex-1 rounded-r-none"
            placeholder="Add admin email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
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

export default AdminWhitelistSection;