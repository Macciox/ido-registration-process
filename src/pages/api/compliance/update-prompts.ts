import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const prompts = req.body;
    
    // Validate prompt structure
    const requiredKeys = ['WHITEPAPER_ANALYSIS', 'LEGAL_ANALYSIS', 'SYSTEM_PROMPT'];
    for (const key of requiredKeys) {
      if (!prompts[key] || typeof prompts[key] !== 'string') {
        return res.status(400).json({ error: `Missing or invalid prompt: ${key}` });
      }
    }

    // Create new prompts file content
    const promptsContent = `export const COMPLIANCE_PROMPTS = {
  WHITEPAPER_ANALYSIS: \`${prompts.WHITEPAPER_ANALYSIS.replace(/`/g, '\\`')}\`,

  LEGAL_ANALYSIS: \`${prompts.LEGAL_ANALYSIS.replace(/`/g, '\\`')}\`,

  SYSTEM_PROMPT: \`${prompts.SYSTEM_PROMPT.replace(/`/g, '\\`')}\`
};

export function getPromptForTemplate(templateType: string): string {
  switch (templateType) {
    case 'whitepaper':
      return COMPLIANCE_PROMPTS.WHITEPAPER_ANALYSIS;
    case 'legal':
      return COMPLIANCE_PROMPTS.LEGAL_ANALYSIS;
    default:
      return COMPLIANCE_PROMPTS.WHITEPAPER_ANALYSIS;
  }
}

export function formatPrompt(
  template: string,
  variables: {
    category: string;
    item_name: string;
    description: string;
    relevant_content: string;
  }
): string {
  return template
    .replace('{category}', variables.category)
    .replace('{item_name}', variables.item_name)
    .replace('{description}', variables.description)
    .replace('{relevant_content}', variables.relevant_content);
}`;

    // Write to prompts file
    const promptsPath = path.join(process.cwd(), 'src', 'lib', 'compliance', 'prompts.ts');
    fs.writeFileSync(promptsPath, promptsContent, 'utf8');

    res.status(200).json({ success: true, message: 'Prompts updated successfully' });

  } catch (error: any) {
    console.error('Error updating prompts:', error);
    res.status(500).json({ error: 'Failed to update prompts', message: error.message });
  }
}