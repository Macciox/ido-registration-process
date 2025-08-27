import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, templateId } = req.body;

  if (!documentId || !templateId) {
    return res.status(400).json({ error: 'Document ID and template ID required' });
  }

  try {
    // Mock response for testing
    const mockResults = [
      {
        item_id: '1',
        item_name: 'Token Distribution',
        category: 'Tokenomics',
        status: 'FOUND',
        coverage_score: 85,
        reasoning: 'Token distribution is clearly outlined in section 3.2',
        evidence: [{ snippet: 'Token distribution: 40% public sale, 30% team, 20% ecosystem, 10% advisors' }]
      },
      {
        item_id: '2', 
        item_name: 'Use of Proceeds',
        category: 'Financial',
        status: 'NEEDS_CLARIFICATION',
        coverage_score: 60,
        reasoning: 'Use of proceeds mentioned but lacks detail',
        evidence: [{ snippet: 'Funds will be used for development and marketing' }]
      }
    ];

    const summary = {
      found_items: 1,
      clarification_items: 1,
      missing_items: 0,
      overall_score: 72
    };

    res.status(200).json({
      checkId: 'test-check-123',
      results: mockResults,
      summary
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}