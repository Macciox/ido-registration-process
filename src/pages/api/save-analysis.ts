import { NextApiRequest, NextApiResponse } from 'next';
import { saveAnalysis, AnalysisData } from '@/lib/analysis-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      docId, 
      docHash, 
      docName, 
      templateId,
      analysisResults, 
      overwrite = false,
      specificCheckId
    } = req.body;

    if (!docId || !docName || !templateId || !analysisResults) {
      return res.status(400).json({ 
        error: 'Missing required fields: docId, docName, templateId, analysisResults' 
      });
    }

    const analysisData: AnalysisData = {
      results: analysisResults.results || [],
      summary: analysisResults.summary || {
        found_items: 0,
        clarification_items: 0,
        missing_items: 0,
        overall_score: 0
      }
    };

    const result = await saveAnalysis(
      docId,
      docHash,
      docName,
      templateId,
      analysisData,
      overwrite,
      undefined, // projectId
      specificCheckId // Pass specific check ID to overwrite
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        checkId: result.checkId,
        version: result.version,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message
      });
    }

  } catch (error: any) {
    console.error('Save analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to save analysis',
      details: error.message 
    });
  }
}