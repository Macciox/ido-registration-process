import { supabase } from './supabase';

// Service to send verification emails using the Next.js API route
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // First, mark the verification code as not sent
    await supabase
      .from('verification_codes')
      .update({ email_sent: false })
      .eq('email', email)
      .eq('code', code);
    
    // Call the Next.js API route
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });
    
    // Check if the API call was successful
    if (!response.ok) {
      console.error('Error sending email:', response.statusText);
      return false;
    }
    
    try {
      const data = await response.json();
      console.log('Email API response:', data);
      
      // If we got a successful response from the API, consider it sent
      // The webhook will update the email_sent status later
      return true;
    } catch (jsonError) {
      console.error('Error parsing API response:', jsonError);
      // If we can't parse the response but the status was OK, still consider it a success
      return true;
    }
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}