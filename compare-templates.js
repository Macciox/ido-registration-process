// Script to compare database template with CSV reference
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://gitxgpwxxutrdvdirdke.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdHhncHd4eHV0cmR2ZGlyZGtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAyNDQ2MywiZXhwIjoyMDY1NjAwNDYzfQ.coOsEQG0ETuu9sq4r8pI5Lr1EB0EAuGEBVswdeN87TI'
);

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || '';
    });
    return item;
  });
}

async function compareTemplates() {
  console.log('🔍 Comparing Legal Template: Database vs CSV Reference\n');

  // Check if CSV file exists
  const csvPath = path.join(__dirname, 'templates', 'legal-template.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('❌ CSV file not found at:', csvPath);
    console.log('📁 Please upload legal-template.csv to the templates/ folder');
    return;
  }

  // Read CSV reference
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const csvItems = parseCSV(csvContent);
  console.log(`📄 CSV Reference: ${csvItems.length} items`);

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
  if (csvItems.length !== dbItems.length) {
    console.log(`⚠️ COUNT MISMATCH: CSV has ${csvItems.length} items, DB has ${dbItems.length} items\n`);
  }

  // Compare each item
  const differences = [];
  const csvMap = new Map(csvItems.map(item => [item.item_name, item]));
  const dbMap = new Map(dbItems.map(item => [item.item_name, item]));

  // Check items in CSV but not in DB
  csvItems.forEach(csvItem => {
    if (!dbMap.has(csvItem.item_name)) {
      differences.push({
        type: 'MISSING_IN_DB',
        item_name: csvItem.item_name,
        details: 'Item exists in CSV but not in database'
      });
    }
  });

  // Check items in DB but not in CSV
  dbItems.forEach(dbItem => {
    if (!csvMap.has(dbItem.item_name)) {
      differences.push({
        type: 'EXTRA_IN_DB',
        item_name: dbItem.item_name,
        details: 'Item exists in database but not in CSV'
      });
    }
  });

  // Check for field differences
  csvItems.forEach(csvItem => {
    const dbItem = dbMap.get(csvItem.item_name);
    if (dbItem) {
      const fieldDiffs = [];
      
      if (csvItem.category !== dbItem.category) {
        fieldDiffs.push(`Category: CSV="${csvItem.category}" vs DB="${dbItem.category}"`);
      }
      
      if (csvItem.field_type !== dbItem.field_type) {
        fieldDiffs.push(`Field Type: CSV="${csvItem.field_type}" vs DB="${dbItem.field_type}"`);
      }
      
      if (csvItem.scoring_logic !== dbItem.scoring_logic) {
        fieldDiffs.push(`Scoring Logic: CSV="${csvItem.scoring_logic}" vs DB="${dbItem.scoring_logic}"`);
      }

      if (fieldDiffs.length > 0) {
        differences.push({
          type: 'FIELD_MISMATCH',
          item_name: csvItem.item_name,
          details: fieldDiffs.join('; ')
        });
      }
    }
  });

  // Report results
  if (differences.length === 0) {
    console.log('✅ PERFECT MATCH: Database template matches CSV reference exactly!');
  } else {
    console.log(`⚠️ Found ${differences.length} differences:\n`);
    
    differences.forEach((diff, index) => {
      console.log(`${index + 1}. ${diff.type}: ${diff.item_name}`);
      console.log(`   ${diff.details}\n`);
    });
  }

  // Summary by category
  console.log('📊 Summary by Category:');
  const csvCategories = [...new Set(csvItems.map(item => item.category))];
  const dbCategories = [...new Set(dbItems.map(item => item.category))];
  
  csvCategories.forEach(category => {
    const csvCount = csvItems.filter(item => item.category === category).length;
    const dbCount = dbItems.filter(item => item.category === category).length;
    const match = csvCount === dbCount ? '✅' : '⚠️';
    console.log(`  ${match} ${category}: CSV=${csvCount}, DB=${dbCount}`);
  });
}

compareTemplates().catch(console.error);