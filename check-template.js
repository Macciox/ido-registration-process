const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gitxgpwxxutrdvdirdke.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdHhncHd4eHV0cmR2ZGlyZGtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAyNDQ2MywiZXhwIjoyMDY1NjAwNDYzfQ.coOsEQG0ETuu9sq4r8pI5Lr1EB0EAuGEBVswdeN87TI'
);

async function checkTemplate() {
  console.log('🔍 Checking Legal Template Scoring Logic...\n');

  const { data: items } = await supabase
    .from('checker_items')
    .select('item_name, category, scoring_logic, field_type')
    .eq('template_id', '550e8400-e29b-41d4-a716-446655440002')
    .order('sort_order');

  if (!items || items.length === 0) {
    console.log('❌ No items found in legal template');
    return;
  }

  console.log(`📋 Found ${items.length} items in legal template:\n`);
  
  items.forEach((item, i) => {
    console.log(`${i + 1}. ${item.item_name}`);
    console.log(`   Category: ${item.category}`);
    console.log(`   Field Type: ${item.field_type || 'Not set'}`);
    console.log(`   Scoring Logic: ${item.scoring_logic || 'Not set'}`);
    console.log('');
  });

  // Check for problematic scoring logic
  const problematicItems = items.filter(item => 
    !item.scoring_logic || 
    item.scoring_logic.includes('Not scored') ||
    !item.scoring_logic.includes('=')
  );

  if (problematicItems.length > 0) {
    console.log(`⚠️ Found ${problematicItems.length} items with problematic scoring:`);
    problematicItems.forEach(item => {
      console.log(`  - ${item.item_name}: "${item.scoring_logic}"`);
    });
  }
}

checkTemplate().catch(console.error);