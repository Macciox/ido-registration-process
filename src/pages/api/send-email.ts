import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    // Log API key for debugging (only first few characters)
    const apiKey = process.env.RESEND_API_KEY;
    console.log(`Using API key: ${apiKey ? apiKey.substring(0, 5) + '...' : 'undefined'}`);
    console.log(`Sending email to ${email} with code ${code}`);

    // Chiamata diretta all'API di Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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

    const data = await response.json();
    
    // Log the complete response for debugging
    console.log('Resend API response:', {
      status: response.status,
      data: data
    });
    
    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(response.status).json(data);
    }

    console.log('Email sent successfully:', data);
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error sending email:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}