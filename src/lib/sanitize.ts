/**
 * Sanitization utilities for security
 */

/**
 * Sanitize input for logging to prevent log injection
 */
export function sanitizeForLog(input: string): string {
  if (typeof input !== 'string') return String(input);
  
  return input
    .replace(/[\r\n]/g, ' ')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
    .substring(0, 1000);
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return String(input);
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate URL to prevent SSRF
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Block private IP ranges
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }
    
    // Block private networks
    if (hostname.startsWith('10.') || 
        hostname.startsWith('192.168.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return false;
    }
    
    // Block metadata services
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize file path to prevent path traversal
 */
export function sanitizeFilePath(filename: string): string {
  if (typeof filename !== 'string') return '';
  
  // Remove path traversal sequences
  return filename
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[<>:"|?*]/g, '')
    .substring(0, 255);
}