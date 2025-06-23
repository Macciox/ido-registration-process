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
    
    // Log the response for debugging
    console.log('Email API response status:', response.status);
    
    // Check if the API call was successful
    if (!response.ok) {
      console.error('Error sending email:', response.statusText);
      return false;
    }
    
    // Wait for the webhook to confirm the email was sent (max 5 seconds)
    let attempts = 0;
    const maxAttempts = 10; // 10 attempts * 500ms = 5 seconds
    
    while (attempts < maxAttempts) {
      // Check if the email has been marked as sent
      const { data, error } = await supabase
        .from('verification_codes')
        .select('email_sent')
        .eq('email', email)
        .eq('code', code)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('Error checking email status:', error);
        break;
      }
      
      if (data && data.length > 0 && data[0].email_sent === true) {
        console.log('Email confirmed as sent by webhook');
        return true;
      }
      
      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    // If we get here, the webhook didn't confirm the email was sent
    // But we'll return true anyway since the API call was successful
    console.log('Email API call successful, but webhook confirmation timed out');
    return true;
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}