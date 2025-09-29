import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { checkId, format } = req.query;

  if (!checkId || !format) {
    return res.status(400).json({ error: 'checkId and format required' });
  }

  try {
    // Get check data from database
    const { data: checkData } = await serviceClient
      .from('compliance_checks')
      .select(`
        *,
        compliance_results (
          *,
          checker_items (item_name, category)
        )
      `)
      .eq('id', checkId)
      .single();

    if (!checkData) {
      return res.status(404).json({ error: 'Check not found' });
    }

    const results = {
      checkId: checkData.id,
      summary: {
        found_items: checkData.found_items || 0,
        clarification_items: checkData.clarification_items || 0,
        missing_items: checkData.missing_items || 0,
        overall_score: checkData.overall_score || 0
      },
      results: checkData.compliance_results?.map((r: any) => ({
        item_name: r.checker_items?.item_name || 'Unknown',
        category: r.checker_items?.category || 'Unknown',
        status: r.status,
        coverage_score: r.coverage_score,
        reasoning: r.reasoning,
        evidence: r.evidence_snippets || []
      })) || [],
      created_at: checkData.created_at,
      template_name: checkData.template_name
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="compliance-${checkId}.json"`);
      return res.status(200).json(results);
    }

    if (format === 'md') {
      const markdown = `# MiCA Compliance Report

## Summary
- Found: ${results.summary.found_items}
- Needs Clarification: ${results.summary.clarification_items}  
- Missing: ${results.summary.missing_items}
- Overall Score: ${results.summary.overall_score}%

## Results
${results.results.map((r: any) => `
### ${r.item_name}
- **Status**: ${r.status}
- **Score**: ${r.coverage_score}%
- **Reasoning**: ${r.reasoning}
`).join('\n')}`;

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="compliance-${checkId}.md"`);
      return res.status(200).send(markdown);
    }

    if (format === 'pdf') {
      // For now, return markdown - PDF generation can be added later
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="compliance-${checkId}.txt"`);
      return res.status(200).send('PDF export coming soon - use Markdown for now');
    }

    res.status(400).json({ error: 'Invalid format. Use json, md, or pdf' });

  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed', message: error.message });
  }
}