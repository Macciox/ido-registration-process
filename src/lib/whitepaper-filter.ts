export function filterWhitepaperItems(items: any[], section: 'A' | 'B' | 'C') {
  const sectionMap = {
    'A': 'Part A: Offeror Information',
    'B': 'Part B: Issuer Information', 
    'C': 'Part C: Trading Platform Operator'
  };

  const selectedSection = sectionMap[section];
  
  // Filter out the other two sections, keep everything else
  return items.filter(item => {
    const category = item.category || item.checker_items?.category;
    
    // If it's one of the A/B/C sections
    if (category?.includes('Part A:') || category?.includes('Part B:') || category?.includes('Part C:')) {
      // Only keep the selected section
      return category.includes(selectedSection);
    }
    
    // Keep all other sections (D, E, F, G, H, I)
    return true;
  });
}