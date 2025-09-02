import { NextApiRequest, NextApiResponse } from 'next';
import { getLatestAnalyses } from '@/lib/analysis-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search, minScore, maxScore, status } = req.query;
    
    let analyses = await getLatestAnalyses();
    
    // Apply filters
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      analyses = analyses.filter(analysis => 
        analysis.filename.toLowerCase().includes(searchTerm) ||
        analysis.doc_hash?.toLowerCase().includes(searchTerm) ||
        analysis.version.toString().includes(searchTerm)
      );
    }
    
    if (minScore) {
      analyses = analyses.filter(analysis => 
        analysis.overall_score >= parseInt(minScore.toString())
      );
    }
    
    if (maxScore) {
      analyses = analyses.filter(analysis => 
        analysis.overall_score <= parseInt(maxScore.toString())
      );
    }
    
    if (status) {
      analyses = analyses.filter(analysis => 
        analysis.status === status.toString()
      );
    }
    
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