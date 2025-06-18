import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Local storage key for admin invitations
const LOCAL_STORAGE_KEY = 'admin_invitations';

interface LocalInvitation {
  email: string;
  token: string;
  created_at: string;
  expires_at: string;
}

interface AdminInvitation {
  id: string;
  email: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
  isLocal?: boolean; // Flag for locally stored invitations
}

const AdminInvitationsList: React.FC = () => {
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'warning'} | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      let allInvitations: AdminInvitation[] = [];
      
      // Try to load from database
      try {
        const { data, error } = await supabase
          .from('admin_invitations')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          allInvitations = [...data];
        }
      } catch (err) {
        console.log('Could not load invitations from database');
      }
      
      // Load from localStorage as fallback
      try {
        const localInvitationsStr = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localInvitationsStr) {
          const localInvitations: LocalInvitation[] = JSON.parse(localInvitationsStr);
          
          // Convert to AdminInvitation format and add to list
          const formattedLocalInvitations: AdminInvitation[] = localInvitations.map((inv, index) => ({
            id: `local-${index}`,
            email: inv.email,
            token: inv.token,
            status: 'pending',
            expires_at: inv.expires_at,
            created_at: inv.created_at,
            used_at: null,
            isLocal: true
          }));
          
          // Filter out any that might already be in the database
          const uniqueLocalInvitations = formattedLocalInvitations.filter(
            localInv => !allInvitations.some(dbInv => dbInv.email === localInv.email)
          );
          
          allInvitations = [...allInvitations, ...uniqueLocalInvitations];
        }
      } catch (err) {
        console.log('Could not load invitations from localStorage');
      }
      
      setInvitations(allInvitations);
    } catch (err: any) {
      console.error('Error loading admin invitations:', err);
      setMessage({ text: err.message || 'Failed to load invitations', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (invitation: AdminInvitation) => {
    try {
      // If it's a local invitation, just copy the link
      if (invitation.isLocal) {
        // Generate the invite link
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/admin/invite?token=${invitation.token}&email=${encodeURIComponent(invitation.email)}`;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(link);
        
        setMessage({ text: 'Invitation link copied to clipboard', type: 'success' });
        return;
      }
      
      // Otherwise, update the expiration date in the database
      const { error } = await supabase
        .from('admin_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .eq('id', invitation.id);
      
      if (error) throw error;
      
      // Generate the invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/admin/invite?token=${invitation.token}&email=${encodeURIComponent(invitation.email)}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(link);
      
      setMessage({ text: 'Invitation link copied to clipboard and expiration extended', type: 'success' });
    } catch (err: any) {
      console.error('Error resending invitation:', err);
      setMessage({ text: err.message || 'Failed to resend invitation', type: 'error' });
    }
  };

  const deleteInvitation = async (invitation: AdminInvitation) => {
    try {
      // If it's a local invitation, remove from localStorage
      if (invitation.isLocal) {
        const localInvitationsStr = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localInvitationsStr) {
          const localInvitations: LocalInvitation[] = JSON.parse(localInvitationsStr);
          const updatedInvitations = localInvitations.filter(inv => inv.email !== invitation.email);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedInvitations));
        }
      } else {
        // Otherwise, delete from database
        const { error } = await supabase
          .from('admin_invitations')
          .delete()
          .eq('id', invitation.id);
        
        if (error) throw error;
      }
      
      // Remove from local state
      setInvitations(prev => prev.filter(inv => 
        inv.isLocal ? inv.email !== invitation.email : inv.id !== invitation.id
      ));
      
      setMessage({ text: 'Invitation deleted successfully', type: 'success' });
    } catch (err: any) {
      console.error('Error deleting invitation:', err);
      setMessage({ text: err.message || 'Failed to delete invitation', type: 'error' });
    }
  };

  const getStatusBadge = (invitation: AdminInvitation) => {
    const isExpired = new Date(invitation.expires_at) < new Date();
    
    if (invitation.isLocal) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Local</span>;
    }
    
    if (isExpired && invitation.status === 'pending') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Expired</span>;
    }
    
    switch (invitation.status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'accepted':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Accepted</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{invitation.status}</span>;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-4">Admin Invitations</h2>
      
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
        <div className="overflow-x-auto">
          {invitations.length === 0 ? (
            <p className="text-gray-500">No invitations found.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invitation.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invitation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-3">
                        {(invitation.status === 'pending' || invitation.isLocal) && (
                          <button
                            onClick={() => resendInvitation(invitation)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Resend Invitation"
                          >
                            {invitation.isLocal ? 'Copy Link' : 'Resend'}
                          </button>
                        )}
                        <button
                          onClick={() => deleteInvitation(invitation)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Invitation"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminInvitationsList;