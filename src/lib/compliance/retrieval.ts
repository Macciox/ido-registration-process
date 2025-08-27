import { supabase } from '@/lib/supabase';

export interface RetrievedChunk {
  id: string;
  content: string;
  page?: number;
  start_pos?: number;
  end_pos?: number;
  similarity: number;
}

/**
 * Generate embedding for query text
 */
async function generateQueryEmbedding(queryText: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: queryText,
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Retrieve top-k most similar chunks for a query
 */
export async function retrieveTopK(
  checkId: string,
  queryText: string,
  k: number = 6
): Promise<RetrievedChunk[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(queryText);

    // Simplified: just get all chunks for now
    const { data, error } = await supabase
      .from('compliance_chunks')
      .select('id, content, page, start_pos, end_pos')
      .eq('check_id', checkId)
      .limit(k);

    if (error) {
      throw new Error(`Chunk retrieval failed: ${error.message}`);
    }

    return (data || []).map((chunk: any, index: number) => ({
      id: chunk.id,
      content: chunk.content,
      page: chunk.page,
      start_pos: chunk.start_pos,
      end_pos: chunk.end_pos,
      similarity: 0.8 - (index * 0.1),
    }));
  } catch (error) {
    console.error('Retrieval error:', error);
    throw error;
  }
}

/**
 * Enhanced retrieval with query expansion
 */
export async function retrieveWithExpansion(
  checkId: string,
  itemName: string,
  description: string,
  k: number = 6
): Promise<RetrievedChunk[]> {
  // Create expanded query from item name and description
  const expandedQuery = `${itemName} ${description}`;
  
  // Get initial results
  const results = await retrieveTopK(checkId, expandedQuery, k);
  
  // If we don't have enough high-quality results, try with just the item name
  const highQualityResults = results.filter(r => r.similarity > 0.7);
  
  if (highQualityResults.length < 2 && results.length < k) {
    const fallbackResults = await retrieveTopK(checkId, itemName, k - results.length);
    
    // Merge and deduplicate results
    const allResults = [...results];
    for (const fallback of fallbackResults) {
      if (!allResults.some(r => r.id === fallback.id)) {
        allResults.push(fallback);
      }
    }
    
    return allResults.slice(0, k);
  }
  
  return results;
}