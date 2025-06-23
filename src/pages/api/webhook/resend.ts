import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the webhook payload
    const payload = req.body;
    
    // Log the webhook payload
    console.log('Resend webhook payload:', payload);
    
    // Check if this is an email.sent or email.delivered event
    if (payload.type === 'email.sent' || payload.type === 'email.delivered') {
      const { to, subject } = payload.data;
      
      // Extract the email address (remove any name part)
      const email = to[0].includes('<') 
        ? to[0].match(/<(.+)>/)?.[1] || to[0]
        : to[0];
      
      // Only process verification emails
      if (subject.includes('Verify your email')) {
        // Update the email_sent status in the database
        const { error } = await supabase
          .from('verification_codes')
          .update({ email_sent: true })
          .eq('email', email)
          .is('email_sent', null)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (error) {
          console.error('Error updating verification code:', error);
        }
      }
    }
    
    // Always return success to Resend
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}