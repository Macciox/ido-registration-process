import { NextApiRequest, NextApiResponse } from 'next';
import { getLatestAnalyses } from '@/lib/analysis-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const analyses = await getLatestAnalyses();
    
    res.status(200).json({
      success: true,
      analyses: analyses,
      count: analyses.length
    });

  } catch (error: any) {
    console.error('Get analyses error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analyses',
      details: error.message 
    });
  }
}