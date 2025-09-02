import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { checkId } = req.query;

  if (req.method === 'DELETE') {
    try {
      // Delete compliance_results first (foreign key constraint)
      await serviceClient
        .from('compliance_results')
        .delete()
        .eq('check_id', checkId);

      // Delete compliance_checks
      const { error } = await serviceClient
        .from('compliance_checks')
        .delete()
        .eq('id', checkId);

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: 'Analysis deleted successfully'
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete analysis',
        details: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}