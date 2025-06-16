import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

const AdminInvite: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const generateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      // Create a unique token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store the invitation in the database
      const { error } = await supabase
        .from('admin_invitations')
        .insert([{ 
          email, 
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
        }]);
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setMessage({ text: 'An invitation for this email already exists', type: 'error' });
        } else {
          throw error;
        }
        return;
      }
      
      // Generate the invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/admin/invite?token=${token}&email=${encodeURIComponent(email)}`;
      
      setInviteLink(link);
      setMessage({ text: 'Admin invitation created successfully', type: 'success' });
      setEmail('');
    } catch (err: any) {
      console.error('Error creating admin invitation:', err);
      setMessage({ text: err.message || 'Failed to create invitation', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-6">Invite New Admin</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={generateInvite}>
        <div className="mb-4">
          <label className="form-label" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="new-admin@example.com"
            required
          />
        </div>
        
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Invitation Link'}
        </button>
      </form>
      
      {inviteLink && (
        <div className="mt-4">
          <label className="form-label">Invitation Link</label>
          <div className="flex mt-1">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="form-input flex-1"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                setMessage({ text: 'Link copied to clipboard', type: 'success' });
              }}
              className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Copy
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Send this link to the new admin. The link will expire in 7 days.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminInvite;