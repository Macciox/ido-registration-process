import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, templateId } = req.body;

  if (!documentId || !templateId) {
    return res.status(400).json({ error: 'Document ID and template ID required' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get document
    const { data: document } = await serviceClient
      .from('compliance_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get template
    const { data: template } = await serviceClient
      .from('checker_templates')
      .select('*, checker_items(*)')
      .eq('id', templateId)
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Mock analysis for now - will implement full analysis step by step
    const mockResults = template.checker_items.map((item: any, index: number) => ({
      item_id: item.id,
      item_name: item.item_name,
      category: item.category,
      status: index % 3 === 0 ? 'FOUND' : index % 3 === 1 ? 'NEEDS_CLARIFICATION' : 'MISSING',
      coverage_score: Math.floor(Math.random() * 100),
      reasoning: `Analysis for ${item.item_name}: ${item.description}`,
      evidence: index % 2 === 0 ? [{ snippet: `Evidence found for ${item.item_name}` }] : []
    }));

    const summary = {
      found_items: mockResults.filter((r: any) => r.status === 'FOUND').length,
      clarification_items: mockResults.filter((r: any) => r.status === 'NEEDS_CLARIFICATION').length,
      missing_items: mockResults.filter((r: any) => r.status === 'MISSING').length,
      overall_score: Math.round(mockResults.reduce((sum: number, r: any) => sum + r.coverage_score, 0) / mockResults.length)
    };

    res.status(200).json({
      checkId: `check-${Date.now()}`,
      results: mockResults,
      summary
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
}