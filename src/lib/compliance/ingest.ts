import * as pdfjsLib from 'pdfjs-dist';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Configure PDF.js worker for Vercel
if (typeof window === 'undefined') {
  // Node.js environment - use CDN worker for Vercel compatibility
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface PageText {
  page: number;
  text: string;
}

export interface Chunk {
  content: string;
  page?: number;
  start: number;
  end: number;
  index: number;
}

/**
 * Extract text from PDF file or buffer
 */
export async function extractTextFromPdf(fileOrBuffer: File | Buffer): Promise<PageText[]> {
  try {
    let arrayBuffer: ArrayBuffer;
    
    if (fileOrBuffer instanceof File) {
      const buffer = await fileOrBuffer.arrayBuffer();
      arrayBuffer = buffer as ArrayBuffer;
    } else {
      arrayBuffer = fileOrBuffer.buffer.slice(
        fileOrBuffer.byteOffset,
        fileOrBuffer.byteOffset + fileOrBuffer.byteLength
      ) as ArrayBuffer;
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: PageText[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 0) {
        pages.push({ page: pageNum, text });
      }
    }

    return pages;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

/**
 * Extract text from URL using readability
 */
export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ComplianceBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      // Fallback to simple text extraction
      const textContent = dom.window.document.body?.textContent || '';
      return textContent.replace(/\s+/g, ' ').trim();
    }

    return article.textContent.replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('URL extraction error:', error);
    throw new Error(`Failed to extract text from URL: ${error}`);
  }
}

/**
 * Chunk pages with semantic awareness
 */
export function chunkPages(
  pages: PageText[],
  size: number = 1600,
  overlap: number = 200
): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const pageData of pages) {
    const text = pageData.text;
    
    // If page is smaller than chunk size, keep as single chunk
    if (text.length <= size) {
      chunks.push({
        content: text,
        page: pageData.page,
        start: 0,
        end: text.length,
        index: chunkIndex++,
      });
      continue;
    }

    // Split large pages into overlapping chunks
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + size, text.length);
      
      // Try to break at sentence boundaries
      if (end < text.length) {
        const sentenceEnd = text.lastIndexOf('.', end);
        const paragraphEnd = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(sentenceEnd, paragraphEnd);
        
        if (breakPoint > start + size * 0.7) {
          end = breakPoint + 1;
        }
      }

      const content = text.slice(start, end).trim();
      if (content.length > 0) {
        chunks.push({
          content,
          page: pageData.page,
          start,
          end,
          index: chunkIndex++,
        });
      }

      // Move start position with overlap
      start = Math.max(start + size - overlap, end);
    }
  }

  return chunks;
}

/**
 * Generate embeddings for chunks using OpenAI
 */
export async function embedChunks(chunks: Chunk[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const embeddings: number[][] = [];
  const batchSize = 100;
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(chunk => chunk.content);

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
          dimensions: 1536,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const batchEmbeddings = data.data.map((item: any) => item.embedding);
      embeddings.push(...batchEmbeddings);

      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Embedding batch failed:`, error);
      throw error;
    }
  }

  return embeddings;
}

/**
 * Save chunks and embeddings to database
 */
export async function saveChunks(
  checkId: string,
  chunks: Chunk[],
  embeddings: number[][]
): Promise<void> {
  const { supabase } = await import('@/lib/supabase');
  
  if (chunks.length !== embeddings.length) {
    throw new Error('Chunks and embeddings arrays must have the same length');
  }

  const chunkData = chunks.map((chunk, index) => ({
    check_id: checkId,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[index]),
    chunk_index: chunk.index,
    page: chunk.page,
    start_pos: chunk.start,
    end_pos: chunk.end,
  }));

  const { error } = await supabase
    .from('compliance_chunks')
    .insert(chunkData);

  if (error) {
    throw new Error(`Failed to save chunks: ${error.message}`);
  }
}

/**
 * Main document ingestion function
 */
export async function ingestDocument(
  checkId: string,
  documentPath: string,
  inputType: 'pdf' | 'url'
): Promise<void> {
  try {
    let chunks: Chunk[];

    if (inputType === 'pdf') {
      // Download PDF from Supabase Storage
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.storage
        .from('compliance-documents')
        .download(documentPath);

      if (error || !data) {
        throw new Error(`Failed to download PDF: ${error?.message}`);
      }

      // Convert blob to buffer
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract text from PDF
      const pages = await extractTextFromPdf(buffer);
      chunks = chunkPages(pages);
    } else {
      // Extract text from URL
      const text = await extractTextFromUrl(documentPath);
      const pages = [{ page: 1, text }];
      chunks = chunkPages(pages);
    }

    if (chunks.length === 0) {
      throw new Error('No text content extracted from document');
    }

    // Generate embeddings
    const embeddings = await embedChunks(chunks);

    // Save to database
    await saveChunks(checkId, chunks, embeddings);

  } catch (error) {
    console.error('Document ingestion failed:', error);
    throw error;
  }
}