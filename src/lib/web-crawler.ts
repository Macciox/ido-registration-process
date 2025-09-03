import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { htmlToMarkdown } from './web-scraper';
import { chunkText, storeDocumentChunks } from './pdf-processor';

interface CrawlResult {
  url: string;
  title: string;
  content: string;
  wordCount: number;
}

/**
 * Extract all internal links from a page
 */
function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  const baseUrlObj = new URL(baseUrl);
  
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    
    try {
      const linkUrl = new URL(href, baseUrl);
      
      // Only include links from same domain
      if (linkUrl.hostname === baseUrlObj.hostname) {
        // Remove hash fragments and query params for cleaner URLs
        linkUrl.hash = '';
        linkUrl.search = '';
        const cleanUrl = linkUrl.toString();
        
        if (!links.includes(cleanUrl)) {
          links.push(cleanUrl);
        }
      }
    } catch (error) {
      // Invalid URL, skip
    }
  });
  
  return links;
}

/**
 * Crawl a single page
 */
async function crawlPage(url: string): Promise<CrawlResult | null> {
  try {
    console.log('Crawling:', url);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      maxRedirects: 5
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    const title = $('title').text().trim() || 'Untitled';
    const markdown = htmlToMarkdown(html);
    
    if (markdown.trim().length < 100) {
      console.log(`Skipping ${url} - content too short (${markdown.trim().length} chars)`);
      return null; // Skip pages with minimal content
    }
    
    return {
      url,
      title,
      content: markdown,
      wordCount: markdown.split(/\s+/).length
    };
    
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return null;
  }
}

/**
 * Crawl entire website starting from base URL
 */
export async function crawlWebsite(
  baseUrl: string, 
  maxPages: number = 20,
  maxDepth: number = 10
): Promise<{
  success: boolean;
  pages: CrawlResult[];
  totalWords: number;
  message: string;
}> {
  
  const visited = new Set<string>();
  const toVisit: Array<{url: string, depth: number}> = [{url: baseUrl, depth: 0}];
  const results: CrawlResult[] = [];
  
  try {
    console.log(`\n=== STARTING WEBSITE CRAWL ===`);
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Max pages: ${maxPages}, Max depth: ${maxDepth}`);
    
    while (toVisit.length > 0 && results.length < maxPages) {
      const {url, depth} = toVisit.shift()!;
      
      console.log(`\nQueue: ${toVisit.length} remaining, Found: ${results.length}/${maxPages}`);
      console.log(`Checking: ${url} (depth ${depth})`);
      
      if (visited.has(url)) {
        console.log(`Skipping ${url} - already visited`);
        continue;
      }
      
      if (depth > maxDepth) {
        console.log(`Skipping ${url} - depth ${depth} > max ${maxDepth}`);
        continue;
      }
      
      visited.add(url);
      
      // Crawl this page
      const pageResult = await crawlPage(url);
      if (pageResult) {
        results.push(pageResult);
        console.log(`✅ Successfully crawled: ${url} (${pageResult.wordCount} words)`);
        
        // If not at max depth, extract links for further crawling
        if (depth < maxDepth) {
          try {
            const response = await axios.get(url, {timeout: 10000});
            const links = extractLinks(response.data, url);
            console.log(`Found ${links.length} links on ${url}`);
            
            let newLinksAdded = 0;
            // Add new links to visit queue
            for (const link of links) {
              if (!visited.has(link) && !toVisit.some(item => item.url === link)) {
                toVisit.push({url: link, depth: depth + 1});
                newLinksAdded++;
              }
            }
            console.log(`Added ${newLinksAdded} new links to queue`);
          } catch (error) {
            console.error(`Error extracting links from ${url}:`, error);
          }
        } else {
          console.log(`Max depth reached for ${url}, not extracting links`);
        }
      } else {
        console.log(`❌ Failed to crawl or content too short: ${url}`);
      }
      
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const totalWords = results.reduce((sum, page) => sum + page.wordCount, 0);
    
    console.log(`\n=== CRAWL COMPLETED ===`);
    console.log(`Pages found: ${results.length}/${maxPages}`);
    console.log(`Total words: ${totalWords}`);
    console.log(`Pages visited: ${visited.size}`);
    console.log(`Queue remaining: ${toVisit.length}`);
    
    return {
      success: true,
      pages: results,
      totalWords,
      message: `Successfully crawled ${results.length} pages with ${totalWords} total words (visited ${visited.size} URLs total)`
    };
    
  } catch (error: any) {
    return {
      success: false,
      pages: [],
      totalWords: 0,
      message: `Crawling failed: ${error.message}`
    };
  }
}

/**
 * Process crawled website: combine all pages and store as chunks
 */
export async function processCrawledWebsite(
  documentId: string, 
  baseUrl: string,
  maxPages: number = 20
): Promise<{
  success: boolean;
  chunksCount: number;
  totalWords: number;
  pagesCount: number;
  message: string;
}> {
  
  try {
    // Crawl the website
    const crawlResult = await crawlWebsite(baseUrl, maxPages);
    
    if (!crawlResult.success) {
      throw new Error(crawlResult.message);
    }
    
    // Combine all pages into one document
    const combinedContent = crawlResult.pages.map(page => 
      `# ${page.title}\nURL: ${page.url}\n\n${page.content}\n\n---\n\n`
    ).join('');
    
    // Split into chunks
    const chunks = chunkText(combinedContent, 2000);
    
    // Store chunks in database
    await storeDocumentChunks(documentId, chunks);
    
    return {
      success: true,
      chunksCount: chunks.length,
      totalWords: crawlResult.totalWords,
      pagesCount: crawlResult.pages.length,
      message: `Successfully processed ${crawlResult.pages.length} pages into ${chunks.length} chunks`
    };
    
  } catch (error: any) {
    console.error('Website crawling error:', error);
    return {
      success: false,
      chunksCount: 0,
      totalWords: 0,
      pagesCount: 0,
      message: `Website processing failed: ${error.message}`
    };
  }
}