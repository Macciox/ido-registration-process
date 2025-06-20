import { supabase } from './supabase';

// Service to send verification emails using the Supabase Edge Function
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    // Log the email for testing
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // Call the Supabase Edge Function with the exact parameters it expects
    const { data, error } = await supabase.functions.invoke('resend-email', {
      body: { 
        email, 
        code
      }
    });
    
    if (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
    
    console.log('Email sent successfully:', data);
    return true;
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}