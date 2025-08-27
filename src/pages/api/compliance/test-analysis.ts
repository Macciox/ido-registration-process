import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { ingestDocument } from '@/lib/compliance/ingest';
import { retrieveWithExpansion } from '@/lib/compliance/retrieval';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, testQuery } = req.body;

  try {
    console.log('Starting test analysis...');

    // Get document
    const { data: document } = await serviceClient
      .from('compliance_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log('Document found:', document.filename);

    // Create test check
    const { data: checkData } = await serviceClient
      .from('compliance_checks')
      .insert({
        document_id: documentId,
        template_id: '550e8400-e29b-41d4-a716-446655440001', // Default template
        status: 'processing'
      })
      .select()
      .single();

    console.log('Test check created:', checkData.id);

    // Test ingestion
    console.log('Starting document ingestion...');
    await ingestDocument(checkData.id, document.file_path, 'pdf');
    console.log('Document ingestion completed');

    // Check chunks in database
    const { data: chunks } = await serviceClient
      .from('compliance_chunks')
      .select('id, content, page, chunk_index')
      .eq('check_id', checkData.id)
      .order('chunk_index')
      .limit(5);

    console.log(`Found ${chunks?.length || 0} chunks`);

    // Test retrieval
    const query = testQuery || 'token economics tokenomics distribution';
    console.log('Testing retrieval with query:', query);
    
    const retrievedChunks = await retrieveWithExpansion(
      checkData.id,
      query,
      'Test query for token economics',
      3
    );

    console.log(`Retrieved ${retrievedChunks.length} relevant chunks`);

    // Test OpenAI API
    let gptTest = null;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Say "GPT-4 API working" in JSON format: {"status": "working", "message": "GPT-4 API working"}' }],
          max_tokens: 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        gptTest = { success: true, response: data.choices[0]?.message?.content };
      } else {
        gptTest = { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      gptTest = { success: false, error: error.message };
    }

    // Cleanup test check
    await serviceClient
      .from('compliance_checks')
      .delete()
      .eq('id', checkData.id);

    res.status(200).json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        file_path: document.file_path
      },
      ingestion: {
        chunks_created: chunks?.length || 0,
        sample_chunks: chunks?.slice(0, 2).map(c => ({
          page: c.page,
          content_preview: c.content.substring(0, 100) + '...'
        }))
      },
      retrieval: {
        query_used: query,
        chunks_found: retrievedChunks.length,
        sample_results: retrievedChunks.slice(0, 2).map(c => ({
          page: c.page,
          similarity: c.similarity,
          content_preview: c.content.substring(0, 100) + '...'
        }))
      },
      gpt_api: gptTest
    });

  } catch (error: any) {
    console.error('Test analysis error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
}