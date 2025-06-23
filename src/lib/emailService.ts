import { supabase } from './supabase';

// Service to send verification emails using the Supabase Edge Function
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // Call the Supabase Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('rapid-api', {
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
    // Call the Resend API directly
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_RESEND_API_KEY || 're_YbggXEBr_K761b9Y33moCZFVsBdf7mq3r'}`
      },
      body: JSON.stringify({
        from: 'registration@decubateido.com',
        to: [email],
        subject: 'Verify your email for Decubate IDO',
        html: `
          <h2>Verify your email</h2>
          <p>Thank you for registering with Decubate IDO. To complete your registration, please enter the following verification code:</p>
          <h3 style="font-size: 24px; letter-spacing: 2px; text-align: center; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">${code}</h3>
          <p>This code will expire in 30 minutes.</p>
          <p>If you did not request this verification, please ignore this email.</p>
        `
      })
    });
    
    console.log('Fallback email API response status:', response.status);
    return true;
  } catch (err) {
    console.error('Error in sendEmailDirectly:', err);
    return false;
  }
}