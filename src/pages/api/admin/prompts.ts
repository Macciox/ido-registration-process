import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { COMPLIANCE_PROMPTS } from '@/lib/compliance/prompts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getCurrentUser();
    if (!user || (user as any).user_metadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Convert prompts object to array format
    const prompts = Object.entries(COMPLIANCE_PROMPTS).map(([key, value]) => ({
      id: key,
      name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      content: value,
      description: `${key} prompt template`,
      variables: extractVariables(value)
    }));

    res.status(200).json({ prompts });
  } catch (error: any) {
    console.error('Get prompts error:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  
  return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];
}