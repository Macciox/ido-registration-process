import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// Resend webhook signing secret
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || 'whsec_3Ez2oVwsSJ7sz1L31GMIijCYJ+V998v1';

// Verify the webhook signature
function verifySignature(payload: string, signature: string): boolean {
  if (!RESEND_WEBHOOK_SECRET) {
    console.warn('RESEND_WEBHOOK_SECRET is not set, skipping signature verification');
    return true;
  }

  try {
    const hmac = crypto.createHmac('sha256', RESEND_WEBHOOK_SECRET);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the raw body and signature
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['resend-signature'] as string;

    // Verify the signature
    if (signature && !verifySignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

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
        } else {
          console.log(`Updated email_sent status for ${email}`);
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