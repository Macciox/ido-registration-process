// Service to send verification emails using the Next.js API route
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    // Log the email for testing
    console.log(`Sending verification email to ${email} with code: ${code}`);
    
    // Call the Next.js API route
    const response = await fetch('/api/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });
    
    // Check if the response is ok, even if we can't parse it as JSON
    if (!response.ok) {
      console.error('Error sending verification email:', response.statusText);
      return false;
    }
    
    try {
      const data = await response.json();
      console.log('Email sent successfully:', data);
    } catch (jsonError) {
      // If we can't parse the response as JSON, but the status was OK,
      // we still consider it a success
      console.log('Email sent, but could not parse response as JSON');
    }
    
    return true;
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}