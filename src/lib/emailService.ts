import { supabase } from './supabase';

// Service to send verification emails using the Supabase Edge Function
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    // Log the email for testing
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // Try to call the Supabase Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: { 
          email, 
          code
        }
      });
      
      if (error) {
        console.error('Error from Edge Function:', error);
        // Try direct API call as fallback
        return await sendEmailDirectly(email, code);
      }
      
      console.log('Email sent successfully via Edge Function:', data);
      return true;
    } catch (edgeError) {
      console.error('Exception calling Edge Function:', edgeError);
      // Try direct API call as fallback
      return await sendEmailDirectly(email, code);
    }
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}

// Fallback function to send email directly using Resend API
async function sendEmailDirectly(email: string, code: string): Promise<boolean> {
  try {
    // Call the Next.js API route as a fallback
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });
    
    console.log('Fallback email API response status:', response.status);
    return true;
  } catch (err) {
    console.error('Error in sendEmailDirectly:', err);
    return false;
  }
}