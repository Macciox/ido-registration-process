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
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error sending verification email:', data.error || response.statusText);
      return false;
    }
    
    console.log('Email sent successfully:', data);
    return true;
  } catch (err) {
    console.error('Error in sendVerificationEmail:', err);
    return false;
  }
}