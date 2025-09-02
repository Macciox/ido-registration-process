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

  try {
    // Check document exists
    const { data: document, error: docError } = await serviceClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) {
      return res.status(200).json({ 
        step: 'document_check',
        error: docError.message,
        success: false 
      });
    }

    // Check template exists
    const { data: template, error: templateError } = await serviceClient
      .from('checker_templates')
      .select('*, checker_items(*)')
      .eq('id', templateId)
      .single();

    if (templateError) {
      return res.status(200).json({ 
        step: 'template_check',
        error: templateError.message,
        success: false 
      });
    }

    // Check document chunks
    const { data: chunks, error: chunksError } = await serviceClient
      .from('document_chunks')
      .select('content')
      .eq('document_id', documentId);

    if (chunksError) {
      return res.status(200).json({ 
        step: 'chunks_check',
        error: chunksError.message,
        success: false 
      });
    }

    // Test OpenAI API
    const testPrompt = "Say 'API Working' in JSON format: {\"status\": \"working\"}";
    
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: testPrompt }],
        temperature: 0.1,
        max_tokens: 50
      })
    });

    const gptData = await gptResponse.json();

    res.status(200).json({
      success: true,
      checks: {
        document: { found: true, filename: document.filename },
        template: { found: true, name: template.name, items: template.checker_items?.length },
        chunks: { found: chunks?.length || 0 },
        openai: { 
          status: gptResponse.status,
          response: gptData.choices?.[0]?.message?.content || gptData.error?.message || 'Unknown'
        }
      }
    });

  } catch (error: any) {
    res.status(200).json({ 
      step: 'general_error',
      error: error.message,
      success: false 
    });
  }
}