import { supabase } from './supabase';

// In a production environment, you would use a real email service like SendGrid, Mailgun, etc.
// For now, we'll just log the emails to the console and use Supabase's built-in email functionality

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    // Log the email for testing
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // In a real implementation, you would call your email service API here
    // For now, we'll use Supabase's built-in email functionality
    
    // This is a placeholder - in a real implementation, you would customize this
    const { error } = await supabase.functions.invoke('send-verification-email', {
      body: { email, code }
    });
    
    if (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}

// Function to update Supabase email templates
// This is for documentation purposes only - you would run this once manually
export async function updateEmailTemplates() {
  // This would be done in the Supabase dashboard under Authentication > Email Templates
  console.log(`
    To update the email templates in Supabase:
    
    1. Go to the Supabase dashboard
    2. Navigate to Authentication > Email Templates
    3. Edit the "Confirm signup" template
    4. Update the content to include the verification code:
    
    Subject: Verify your email for Decubate IDO
    
    <h2>Verify your email</h2>
    <p>Thank you for registering with Decubate IDO. To complete your registration, please enter the following verification code:</p>
    <h3 style="font-size: 24px; letter-spacing: 2px; text-align: center; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">{{ .Token }}</h3>
    <p>This code will expire in 30 minutes.</p>
    <p>If you did not request this verification, please ignore this email.</p>
  `);
}