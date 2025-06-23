import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get the user by email
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('Error getting users:', getUserError);
      return res.status(500).json({ error: 'Failed to get users' });
    }
    
    const user = users?.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the user to confirm their email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('Error confirming email:', updateError);
      return res.status(500).json({ error: 'Failed to confirm email' });
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error confirming email:', error);
    res.status(500).json({ error: error.message || 'Failed to confirm email' });
  }
};