// Service to send verification emails using the Next.js API route
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // Call the Next.js API route with the new API key
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });
    
    // Log the response for debugging
    console.log('Email API response status:', response.status);
    
    // Parse the response
    try {
      const data = await response.json();
      console.log('Email API response data:', data);
      
      // Check if the response contains an error
      if (data.error) {
        console.error('Email API error:', data.error);
        return false;
      }
      
      // If we got here, the email was sent successfully
      return true;
    } catch (jsonError) {
      console.error('Error parsing API response:', jsonError);
      // If we can't parse the response but the status was OK, still consider it a success
      return response.ok;
    }
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}