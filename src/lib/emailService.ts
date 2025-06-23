// Service to send verification emails using the Next.js API route
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // Call the Next.js API route
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });
    
    // Log the complete response for debugging
    console.log('Email API response status:', response.status);
    
    try {
      const data = await response.json();
      console.log('Email API response data:', data);
      
      if (data.error) {
        console.error('Email API error:', data.error);
        return false;
      }
    } catch (jsonError) {
      console.error('Error parsing API response:', jsonError);
    }
    
    return true;
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}