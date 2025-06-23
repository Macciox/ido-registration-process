import type { NextApiRequest, NextApiResponse } from 'next';
import { EmailTemplate } from '../../components/EmailTemplate';
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
      from: 'IDO Registration <registration@decubateido.com>',
      to: [email],
      subject: 'Verify your email for Decubate IDO',
      react: EmailTemplate({ code }),
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