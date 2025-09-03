// Dual scoring system for Whitepaper vs Legal Opinion

export function calculateScore(results: any[], templateName: string) {
  const normalizedName = templateName.toLowerCase();
  
  if (normalizedName.includes('legal')) {
    return calculateLegalOpinionScore(results);
  } else {
    return calculateWhitepaperScore(results);
  }
}

// Whitepaper MiCA scoring: Percentage based on FOUND items
function calculateWhitepaperScore(results: any[]) {
  const foundItems = results.filter((r: any) => r.status === 'FOUND').length;
  const clarificationItems = results.filter((r: any) => r.status === 'NEEDS_CLARIFICATION').length;
  const missingItems = results.filter((r: any) => r.status === 'MISSING').length;
  const notApplicableItems = results.filter((r: any) => r.status === 'NOT_APPLICABLE').length;
  const applicableItems = results.length - notApplicableItems;
  
  // Calculate score based on applicable items only
  const overallScore = applicableItems > 0 
    ? Math.round((foundItems * 100) / applicableItems)
    : 0;
  
  return {
    found_items: foundItems,
    clarification_items: clarificationItems,
    missing_items: missingItems,
    not_applicable_items: notApplicableItems,
    applicable_items: applicableItems,
    overall_score: overallScore,
    scoring_type: 'whitepaper_percentage'
  };
}

// Legal Opinion scoring: Risk-based total score
function calculateLegalOpinionScore(results: any[]) {
  // Sum up all risk scores
  const totalRiskScore = results.reduce((sum: number, r: any) => {
    return sum + (r.risk_score || r.coverage_score || 0);
  }, 0);
  
  // Count different risk levels
  const highRisk = results.filter((r: any) => (r.risk_score || r.coverage_score || 0) >= 1000).length;
  const mediumRisk = results.filter((r: any) => {
    const score = r.risk_score || r.coverage_score || 0;
    return score >= 5 && score < 1000;
  }).length;
  const lowRisk = results.filter((r: any) => {
    const score = r.risk_score || r.coverage_score || 0;
    return score > 0 && score < 5;
  }).length;
  const noRisk = results.filter((r: any) => (r.risk_score || r.coverage_score || 0) === 0).length;
  
  return {
    total_risk_score: totalRiskScore,
    high_risk_items: highRisk,
    medium_risk_items: mediumRisk,
    low_risk_items: lowRisk,
    no_risk_items: noRisk,
    total_questions: results.length,
    overall_score: totalRiskScore, // For legal opinion, overall score IS the risk score
    scoring_type: 'legal_risk_based'
  };
}