import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check documents
    const { data: docs, error: docsError } = await supabase
      .from('compliance_documents')
      .select('*');

    // Check checks
    const { data: checks, error: checksError } = await supabase
      .from('compliance_checks')
      .select('*');

    res.json({
      user: { id: user.id, email: user.email },
      documents: { data: docs, error: docsError },
      checks: { data: checks, error: checksError }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}