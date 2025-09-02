import { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentChunks } from '@/lib/pdf-processor';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, search } = req.query;

  if (!documentId) {
    return res.status(400).json({ error: 'Document ID required' });
  }

  try {
    const chunks = await getDocumentChunks(documentId as string);
    
    let filteredChunks = chunks;
    
    // If search term provided, filter chunks
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredChunks = chunks.filter(chunk => 
        chunk.content.toLowerCase().includes(searchTerm)
      );
    }
    
    res.status(200).json({
      documentId,
      totalChunks: chunks.length,
      filteredChunks: filteredChunks.length,
      searchTerm: search || null,
      chunks: filteredChunks.map((chunk, index) => ({
        index: chunk.chunk_index,
        wordCount: chunk.word_count,
        preview: chunk.content.substring(0, 300) + '...',
        fullContent: chunk.content,
        containsAddress: chunk.content.toLowerCase().includes('address') || 
                       chunk.content.toLowerCase().includes('headquartered') ||
                       chunk.content.toLowerCase().includes('beachmont') ||
                       chunk.content.toLowerCase().includes('kingstown')
      }))
    });

  } catch (error: any) {
    console.error('Debug chunks error:', error);
    res.status(500).json({ error: 'Failed to fetch chunks', message: error.message });
  }
}