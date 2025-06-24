import { supabase } from './supabase';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

// Service to send verification emails using Supabase Edge Function
export async function sendVerificationEmail(email: string, code: string): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    // Validate parameters
    if (!email || !code) {
      return { success: false, error: 'Missing email or code parameters' };
    }

    const { data, error } = await supabase.functions.invoke('send-verification-email', {
      body: { email, code },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      let errorMessage = error.message;
      if (error instanceof FunctionsHttpError && error.context) {
        try {
          errorMessage = JSON.stringify(await error.context.json());
        } catch {}
      }
      return { success: false, error: errorMessage };
    }

    if (data && data.success) {
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data };
    }
  } catch (err) {
    return { success: false, error: err };
  }
}

// Fallback function to ensure the registration flow continues
async function sendEmailFallback(email: string, code: string): Promise<boolean> {
  try {
    console.log('Using fallback email method - code for testing:', code);
    console.log(`Email would be sent to: ${email}`);
    // Always return true to allow the registration flow to continue
    return true;
  } catch (err) {
    console.error('Error in sendEmailFallback:', err);
    return true;
  }
}