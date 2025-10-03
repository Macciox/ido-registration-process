// Test script per verificare il filtro whitepaper
const { filterWhitepaperItems } = require('./src/lib/whitepaper-filter.ts');

// Dati di test che simulano gli elementi del template
const testItems = [
  { id: 1, item_name: 'Name', category: 'Part A: Offeror Information' },
  { id: 2, item_name: 'Legal form', category: 'Part A: Offeror Information' },
  { id: 3, item_name: 'Issuer name', category: 'Part B: Issuer Information' },
  { id: 4, item_name: 'Issuer legal form', category: 'Part B: Issuer Information' },
  { id: 5, item_name: 'Operator name', category: 'Part C: Trading Platform Operator' },
  { id: 6, item_name: 'Operator legal form', category: 'Part C: Trading Platform Operator' },
  { id: 7, item_name: 'Project and asset name', category: 'Part D: Crypto-Asset Project' },
  { id: 8, item_name: 'Project description', category: 'Part D: Crypto-Asset Project' },
  { id: 9, item_name: 'Offer type indication', category: 'Part E: Offer Information' },
  { id: 10, item_name: 'Asset type', category: 'Part F: Crypto-Asset Details' }
];

console.log('=== TEST FILTRO WHITEPAPER ===\n');

console.log('Elementi originali:', testItems.length);
testItems.forEach(item => console.log(`- ${item.item_name} (${item.category})`));

console.log('\n=== TEST: Solo sezione A ===');
const filteredA = filterWhitepaperItems(testItems, 'A');
console.log('Elementi filtrati:', filteredA.length);
filteredA.forEach(item => console.log(`- ${item.item_name} (${item.category})`));

console.log('\n=== TEST: Sezioni A+B ===');
const filteredAB = filterWhitepaperItems(testItems, 'A+B');
console.log('Elementi filtrati:', filteredAB.length);
filteredAB.forEach(item => console.log(`- ${item.item_name} (${item.category})`));

console.log('\n=== TEST: Tutte le sezioni A+B+C ===');
const filteredABC = filterWhitepaperItems(testItems, 'A+B+C');
console.log('Elementi filtrati:', filteredABC.length);
filteredABC.forEach(item => console.log(`- ${item.item_name} (${item.category})`));

console.log('\n=== RISULTATI ATTESI ===');
console.log('Solo A: dovrebbe mostrare 2 elementi Part A + 4 elementi Part D-F');
console.log('A+B: dovrebbe mostrare 4 elementi Part A+B + 4 elementi Part D-F');
console.log('A+B+C: dovrebbe mostrare tutti i 10 elementi');