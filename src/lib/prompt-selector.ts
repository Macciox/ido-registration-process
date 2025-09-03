// Template-specific prompt selection system

export function getPromptIdForTemplate(templateName: string): string {
  // Normalize template name for comparison
  const normalizedName = templateName.toLowerCase();
  
  if (normalizedName.includes('whitepaper')) {
    return 'WHITEPAPER_ANALYSIS';
  } else if (normalizedName.includes('legal')) {
    return 'LEGAL_OPINION_ANALYSIS';
  } else {
    // Default fallback
    return 'WHITEPAPER_ANALYSIS';
  }
}

export function getPromptDescription(templateName: string): string {
  const normalizedName = templateName.toLowerCase();
  
  if (normalizedName.includes('whitepaper')) {
    return 'Analyzing whitepaper with MiCA-specific requirements and crypto project focus';
  } else if (normalizedName.includes('legal')) {
    return 'Analyzing legal opinion with legal compliance focus and jurisdictional considerations';
  } else {
    return 'Analyzing document with general compliance requirements';
  }
}