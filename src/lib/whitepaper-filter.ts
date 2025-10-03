export function filterWhitepaperItems(items: any[], sections: string) {
  // Parse sections string (e.g., "A", "A+B", "A+C", "A+B+C")
  const selectedSections = sections.split('+').map(s => s.trim());
  
  return items.filter(item => {
    const category = (item.category || item.checker_items?.category || '').toLowerCase();
    
    // Always include sections D-I (they are always included)
    if (category.includes('part d') || category.includes('part e') || 
        category.includes('part f') || category.includes('part g') || 
        category.includes('part h') || category.includes('part i')) {
      return true;
    }
    
    // Only include A, B, C sections if explicitly selected
    // Part A: Offeror Information
    if (category.includes('part a:') && selectedSections.includes('A')) {
      return true;
    }
    
    // Part B: Issuer Information  
    if (category.includes('part b:') && selectedSections.includes('B')) {
      return true;
    }
    
    // Part C: Trading Platform Operator
    if (category.includes('part c:') && selectedSections.includes('C')) {
      return true;
    }
    
    // Exclude all other A, B, C items if not selected
    if (category.includes('part a:') || category.includes('part b:') || category.includes('part c:')) {
      return false;
    }
    
    return false;
  });
}