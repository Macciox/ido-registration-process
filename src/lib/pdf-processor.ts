import pdf from 'pdf-parse';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  word_count: number;
  created_at: string;
}

/**
 * Extract text from PDF buffer
 */
export async function extractPDFText(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdf(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Split text into manageable chunks
 */
export function chunkText(text: string, maxChunkSize: number = 2000): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
}

/**
 * Store document chunks in database
 */
export async function storeDocumentChunks(documentId: string, chunks: string[]): Promise<void> {
  try {
    // Delete existing chunks for this document
    await serviceClient
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    // Insert new chunks
    const chunksToInsert = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content: content,
      word_count: content.split(/\s+/).length
    }));

    const { error } = await serviceClient
      .from('document_chunks')
      .insert(chunksToInsert);

    if (error) {
      throw error;
    }

    console.log(`Stored ${chunks.length} chunks for document ${documentId}`);
  } catch (error) {
    console.error('Error storing chunks:', error);
    throw new Error('Failed to store document chunks');
  }
}

/**
 * Get document chunks from database
 */
export async function getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
  try {
    const { data, error } = await serviceClient
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index');

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching chunks:', error);
    throw new Error('Failed to fetch document chunks');
  }
}

/**
 * Process PDF document: extract text, chunk it, and store
 */
export async function processPDFDocument(documentId: string, pdfBuffer: Buffer): Promise<{
  success: boolean;
  chunksCount: number;
  totalWords: number;
  message: string;
}> {
  try {
    // Extract text from PDF
    const fullText = await extractPDFText(pdfBuffer);
    
    if (!fullText || fullText.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    // Split into chunks
    const chunks = chunkText(fullText);
    
    // Store chunks in database
    await storeDocumentChunks(documentId, chunks);

    const totalWords = chunks.reduce((sum, chunk) => sum + chunk.split(/\s+/).length, 0);

    return {
      success: true,
      chunksCount: chunks.length,
      totalWords,
      message: `Successfully processed PDF: ${chunks.length} chunks, ${totalWords} words`
    };

  } catch (error: any) {
    console.error('PDF processing error:', error);
    return {
      success: false,
      chunksCount: 0,
      totalWords: 0,
      message: `PDF processing failed: ${error.message}`
    };
  }
}