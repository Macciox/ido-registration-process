import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Log environment variables for debugging
    console.log('Environment variables:');
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set (first 5 chars: ' + process.env.RESEND_API_KEY.substring(0, 5) + '...)' : 'Not set');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Test email address
    const testEmail = 'test@example.com';
    
    // Chiamata diretta all'API di Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'registration@decubateido.com',
        to: [testEmail],
        subject: 'Test Email from Decubate IDO',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email to verify that the email sending functionality is working correctly.</p>
          <p>Time sent: ${new Date().toISOString()}</p>
        `
      })
    });

    const data = await response.json();
    
    // Log the complete response for debugging
    console.log('Resend API test response:', {
      status: response.status,
      data: data
    });
    
    return res.status(200).json({
      success: response.ok,
      status: response.status,
      data: data,
      apiKeyPresent: !!process.env.RESEND_API_KEY,
      apiKeyFirstChars: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 5) : null
    });
  } catch (err) {
    console.error('Error in test-email:', err);
    return res.status(500).json({ error: 'Failed to send test email', details: err });
  }
}