import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { chunkText, storeDocumentChunks } from './pdf-processor';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

/**
 * Extract clean text content from HTML
 */
export function extractTextFromHTML(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove script, style, nav, footer, ads
  $('script, style, nav, footer, .ad, .advertisement, .sidebar').remove();
  
  // Focus on main content areas
  const contentSelectors = [
    'main',
    'article', 
    '.content',
    '.main-content',
    '.documentation',
    '.docs',
    '#content',
    'body'
  ];
  
  let content = '';
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text();
      break;
    }
  }
  
  // Fallback to body if no content found
  if (!content) {
    content = $('body').text();
  }
  
  // Clean up whitespace
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Convert HTML to Markdown for better structure
 */
export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  $('script, style, nav, footer, .ad, .advertisement, .sidebar').remove();
  
  // Get main content
  const contentSelectors = [
    'main',
    'article', 
    '.content',
    '.main-content',
    '.documentation',
    '.docs',
    '#content'
  ];
  
  let contentHtml = '';
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      contentHtml = element.html() || '';
      break;
    }
  }
  
  if (!contentHtml) {
    contentHtml = $('body').html() || '';
  }
  
  // Convert to markdown
  return turndownService.turndown(contentHtml);
}

/**
 * Scrape webpage and extract content
 */
export async function scrapeWebpage(url: string): Promise<{
  success: boolean;
  content: string;
  title: string;
  wordCount: number;
  message: string;
}> {
  try {
    console.log('Scraping URL:', url);
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Get page title
    const title = $('title').text().trim() || 'Untitled Page';
    
    // Extract content as markdown (preserves structure better)
    const markdown = htmlToMarkdown(html);
    
    if (!markdown || markdown.trim().length < 100) {
      throw new Error('Insufficient content extracted from webpage');
    }
    
    const wordCount = markdown.split(/\s+/).length;
    
    return {
      success: true,
      content: markdown,
      title,
      wordCount,
      message: `Successfully scraped webpage: ${wordCount} words extracted`
    };
    
  } catch (error: any) {
    console.error('Web scraping error:', error);
    return {
      success: false,
      content: '',
      title: '',
      wordCount: 0,
      message: `Web scraping failed: ${error.message}`
    };
  }
}

/**
 * Process webpage: scrape content, chunk it, and store
 */
export async function processWebpage(documentId: string, url: string): Promise<{
  success: boolean;
  chunksCount: number;
  totalWords: number;
  title: string;
  message: string;
}> {
  try {
    // Scrape webpage content
    const scrapingResult = await scrapeWebpage(url);
    
    if (!scrapingResult.success) {
      throw new Error(scrapingResult.message);
    }
    
    // Split into chunks
    const chunks = chunkText(scrapingResult.content, 2000);
    
    // Store chunks in database
    await storeDocumentChunks(documentId, chunks);
    
    return {
      success: true,
      chunksCount: chunks.length,
      totalWords: scrapingResult.wordCount,
      title: scrapingResult.title,
      message: `Successfully processed webpage: ${chunks.length} chunks, ${scrapingResult.wordCount} words`
    };
    
  } catch (error: any) {
    console.error('Webpage processing error:', error);
    return {
      success: false,
      chunksCount: 0,
      totalWords: 0,
      title: '',
      message: `Webpage processing failed: ${error.message}`
    };
  }
}