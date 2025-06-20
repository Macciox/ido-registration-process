import { supabase } from './supabase';

// Service to send verification emails using the Supabase Edge Function
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    // Log the email for testing
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('resend-email', {
      body: { 
        email, 
        subject: 'Verify your email for Decubate IDO',
        html: `
          <h2>Verify your email</h2>
          <p>Thank you for registering with Decubate IDO. To complete your registration, please enter the following verification code:</p>
          <h3 style="font-size: 24px; letter-spacing: 2px; text-align: center; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">${code}</h3>
          <p>This code will expire in 30 minutes.</p>
          <p>If you did not request this verification, please ignore this email.</p>
        `
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