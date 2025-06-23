import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const { data, error } = await resend.emails.send({
      from: 'Decubate IDO <onboarding@resend.dev>',
      to: [email],
      subject: 'Verify your email for Decubate IDO',
      html: `
        <h2>Verify your email</h2>
        <p>Thank you for registering with Decubate IDO. To complete your registration, please enter the following verification code:</p>
        <h3 style="font-size: 24px; letter-spacing: 2px; text-align: center; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">${code}</h3>
        <p>This code will expire in 30 minutes.</p>
        <p>If you did not request this verification, please ignore this email.</p>
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      return res.status(400).json(error);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Error sending email:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};