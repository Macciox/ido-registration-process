// Compare database template with Excel reference
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://gitxgpwxxutrdvdirdke.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdHhncHd4eHV0cmR2ZGlyZGtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAyNDQ2MywiZXhwIjoyMDY1NjAwNDYzfQ.coOsEQG0ETuu9sq4r8pI5Lr1EB0EAuGEBVswdeN87TI'
);

// Parse the Excel content (already read as CSV-like format)
const excelContent = `Section,Question,Field Type,Scoring Logic
MiFID II - Financial Instrument,"Does the token grant any rights similar to shares, loans or bonds, such as dividends, voting power, or redemption rights?",Yes/No + Text field if Yes,"Yes = 1000, No = 0"
MiFID II - Financial Instrument,Is the token structured in a way that derives its value from the price or performance of another asset or index (i.e. a derivative)?,Yes/No + Text field if Yes,"Yes = 1000, No = 0"
MiFID II - Financial Instrument,Is the token part of a class of securities that are negotiable on financial or secondary markets?,Yes/No/Not sure,"Yes = 1000, Not sure = 5, No = 0"
EMT/ART Qualification,"Is the token pegged to the value of a single official currency (e.g. EUR, USD)?",Yes/No,"Yes = 1000, No = 0"
EMT/ART Qualification,"Does the token reference or track the value of a basket of assets, currencies, or other rights (e.g. BTC, gold, or a mix)?",Yes/No/Other + Text field,"Yes = 1000, Other = 5, No = 0"
EMT/ART Qualification,"Are you using any terms like "stable", "backed by X", "interest", or similar in your token name, branding, or marketing?",Yes/No/Other + Text field,"Yes = 5, Other = 3, No = 0"
Utility Token Qualification,What is the main purpose of the token for its holders?,Dropdown: Access to services / Governance only / Investment returns / Other + Text field,"Investment returns = 5, Other = 3, Access/Governance = 0"
Utility Token Qualification,"Are any staking, burning, or locking mechanisms included in the token's design? If so, are these mechanisms linked to yield, return, or appreciation?",Yes/No/Other + Text field,"Yes = 3, Other = 3, No = 0"
Utility Token Qualification,Is the token transferable and fungible across wallets and platforms?,Yes/No/Other + Text field,"No = 3, Other = 1, Yes = 0"
Utility Token Qualification,"Does the token offer financial or economic incentives in exchange for holding, staking, or participating?",Yes/No/Other + Text field,"Yes = 5, Other = 3, No = 0"
Whitepaper & Marketing,"Will the total public offering of the token in the EU be below €1,000,000 within a 12-month period?",Yes/No/Not sure,"No = 5, Not sure = 3, Yes = 0"
Whitepaper & Marketing,"Have you announced, or do you plan to announce, a listing or application for trading of the token on any exchange within the EU?",Yes/No/Planning to/Not sure,"Yes = 5, Planning = 5, Not sure = 3, No = 0"
Whitepaper & Marketing,Are you planning to offer this token to more than 150 persons per EU Member State?,Yes/No/Not sure,"Yes = 5, Not sure = 3, No = 0"
Whitepaper & Marketing,Will a crypto-asset whitepaper be made available under MiCAR rules?,Yes/No/Not applicable,"No = 3, Not applicable = 0, Yes = 0"
Whitepaper & Marketing,"Are your marketing materials (website, docs, social media) free from misleading, unclear, or overly promotional language that could imply guaranteed returns?",Yes/No/Not sure,"No = 5, Not sure = 3, Yes = 0"
Whitepaper & Marketing,Provide a link to your main website or documentation.,Text field,Not scored
Legal Entity,"Is the token issuer a registered legal person (company, foundation, etc.)?",Yes/No + Text field,"No = 1000, Yes = 0"
Legal Entity,In which country is the issuer incorporated?,Text field,Not scored
Legal Entity,"Are you actively marketing or promoting the token to EU-based users, or are you relying on reverse solicitation?",Dropdown: Actively marketing / Reverse solicitation / Not sure + Text field,"Actively marketing = 5, Not sure = 3, Reverse = 0"
Governance / Misc.,"Does the token offer governance rights (e.g. DAO voting, protocol decisions)? If yes, are these rights only functional and non-financial?",Yes/No/Other + Text field,"Yes = 0, No = 0, Other = 3"
Governance / Misc.,"Is the token offered 'for free' (e.g. via airdrop or reward) in exchange for user data, promotional activity, or other indirect consideration?",Yes/No/Other + Text field,"Yes = 5, Other = 3, No = 0"`;

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = ['category', 'item_name', 'field_type', 'scoring_logic'];
  
  return lines.slice(1).map((line, index) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    return {
      category: values[0] || '',
      item_name: values[1] || '',
      field_type: values[2] || '',
      scoring_logic: values[3] || '',
      sort_order: index + 1
    };
  });
}

async function compareTemplates() {
  console.log('🔍 Comparing Legal Template: Database vs Excel Reference\n');

  // Parse Excel content
  const excelItems = parseCSV(excelContent);
  console.log(`📄 Excel Reference: ${excelItems.length} items`);

  // Get database template
  const { data: dbItems } = await supabase
    .from('checker_items')
    .select('item_name, category, field_type, scoring_logic, description, sort_order')
    .eq('template_id', '550e8400-e29b-41d4-a716-446655440002')
    .order('sort_order');

  console.log(`💾 Database: ${dbItems?.length || 0} items\n`);

  if (!dbItems || dbItems.length === 0) {
    console.log('❌ No items found in database template');
    return;
  }

  // Compare counts
  if (excelItems.length !== dbItems.length) {
    console.log(`⚠️ COUNT MISMATCH: Excel has ${excelItems.length} items, DB has ${dbItems.length} items\n`);
  }

  // Create simplified comparison maps
  const excelMap = new Map();
  const dbMap = new Map();

  // Normalize item names for comparison
  excelItems.forEach((item, index) => {
    const key = item.item_name.toLowerCase().replace(/[^\w\s]/g, '').trim();
    excelMap.set(key, { ...item, originalName: item.item_name, index });
  });

  dbItems.forEach((item, index) => {
    const key = item.item_name.toLowerCase().replace(/[^\w\s]/g, '').trim();
    dbMap.set(key, { ...item, originalName: item.item_name, index });
  });

  console.log('📊 DETAILED COMPARISON:\n');

  // Compare each Excel item with DB
  let matches = 0;
  let differences = [];

  excelItems.forEach((excelItem, index) => {
    const excelKey = excelItem.item_name.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const dbItem = dbMap.get(excelKey);

    console.log(`${index + 1}. ${excelItem.item_name}`);
    console.log(`   Excel Category: ${excelItem.category}`);
    console.log(`   Excel Field Type: ${excelItem.field_type}`);
    console.log(`   Excel Scoring: ${excelItem.scoring_logic}`);

    if (dbItem) {
      console.log(`   ✅ DB Category: ${dbItem.category}`);
      console.log(`   ✅ DB Field Type: ${dbItem.field_type || 'Not set'}`);
      console.log(`   ✅ DB Scoring: ${dbItem.scoring_logic || 'Not set'}`);

      // Check for differences
      const diffs = [];
      if (excelItem.category !== dbItem.category) {
        diffs.push(`Category mismatch`);
      }
      if (excelItem.field_type !== dbItem.field_type) {
        diffs.push(`Field type mismatch`);
      }
      if (excelItem.scoring_logic !== dbItem.scoring_logic) {
        diffs.push(`Scoring logic mismatch`);
      }

      if (diffs.length === 0) {
        matches++;
        console.log(`   ✅ PERFECT MATCH`);
      } else {
        differences.push({
          item: excelItem.item_name,
          issues: diffs
        });
        console.log(`   ⚠️ DIFFERENCES: ${diffs.join(', ')}`);
      }
    } else {
      console.log(`   ❌ NOT FOUND IN DATABASE`);
      differences.push({
        item: excelItem.item_name,
        issues: ['Missing in database']
      });
    }
    console.log('');
  });

  // Summary
  console.log('📈 SUMMARY:');
  console.log(`✅ Perfect matches: ${matches}/${excelItems.length}`);
  console.log(`⚠️ Items with differences: ${differences.length}`);
  console.log(`📊 Match rate: ${Math.round((matches / excelItems.length) * 100)}%\n`);

  if (differences.length > 0) {
    console.log('🔧 ITEMS NEEDING ATTENTION:');
    differences.forEach((diff, index) => {
      console.log(`${index + 1}. ${diff.item}`);
      console.log(`   Issues: ${diff.issues.join(', ')}\n`);
    });
  }

  // Category summary
  console.log('📋 CATEGORIES COMPARISON:');
  const excelCategories = [...new Set(excelItems.map(item => item.category))];
  excelCategories.forEach(category => {
    const excelCount = excelItems.filter(item => item.category === category).length;
    const dbCount = dbItems.filter(item => item.category === category).length;
    const match = excelCount === dbCount ? '✅' : '⚠️';
    console.log(`  ${match} ${category}: Excel=${excelCount}, DB=${dbCount}`);
  });
}

compareTemplates().catch(console.error);