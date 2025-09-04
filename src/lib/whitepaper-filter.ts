export function filterWhitepaperItems(items: any[], sections: string) {
  const sectionMap = {
    'A': 'Part A: Offeror Information',
    'B': 'Part B: Issuer Information', 
    'C': 'Part C: Trading Platform Operator'
  };

  // Parse sections string (e.g., "A", "A+B", "A+C", "A+B+C")
  const selectedSections = sections.split('+').map(s => sectionMap[s.trim() as keyof typeof sectionMap]).filter(Boolean);
  
  return items.filter(item => {
    const category = item.category || item.checker_items?.category;
    
    // If it's one of the A/B/C sections
    if (category?.includes('Part A:') || category?.includes('Part B:') || category?.includes('Part C:')) {
      // Only keep if it matches one of the selected sections
      return selectedSections.some(section => category.includes(section));
    }
    
    // Keep all other sections (D, E, F, G, H, I)
    return true;
  });
}