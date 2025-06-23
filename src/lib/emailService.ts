import { supabase } from './supabase';

// Service to send verification emails using the Supabase Edge Function
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // Call the Supabase Edge Function
    try {
      console.log('Calling Supabase Edge Function: rapid-api');
      const { data, error } = await supabase.functions.invoke('rapid-api', {
        body: { 
          email, 
          code
        }
      });
      
      console.log('Supabase Edge Function response:', { data, error });
      
      if (error) {
        console.error('Error from Edge Function:', error);
        return false;
      }
      
      console.log('Email sent successfully via Edge Function:', data);
      return true;
    } catch (edgeError) {
      console.error('Exception calling Edge Function:', edgeError);
      return false;
    }
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}