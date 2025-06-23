// Service to send verification emails using the Next.js API route
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // Call the Next.js API route
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });
    
    console.log('Email API response status:', response.status);
    return true; // Always return true regardless of the response
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}