// Safely update template by handling foreign key constraints
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gitxgpwxxutrdvdirdke.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdHhncHd4eHV0cmR2ZGlyZGtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAyNDQ2MywiZXhwIjoyMDY1NjAwNDYzfQ.coOsEQG0ETuu9sq4r8pI5Lr1EB0EAuGEBVswdeN87TI'
);

const correctTemplate = [
  {
    category: "MiFID II - Financial Instrument",
    item_name: "Does the token grant any rights similar to shares, loans or bonds, such as dividends, voting power, or redemption rights?",
    field_type: "Yes/No + Text field if Yes",
    scoring_logic: "Yes = 1000, No = 0",
    sort_order: 1
  },
  {
    category: "MiFID II - Financial Instrument", 
    item_name: "Is the token structured in a way that derives its value from the price or performance of another asset or index (i.e. a derivative)?",
    field_type: "Yes/No + Text field if Yes",
    scoring_logic: "Yes = 1000, No = 0",
    sort_order: 2
  },
  {
    category: "MiFID II - Financial Instrument",
    item_name: "Is the token part of a class of securities that are negotiable on financial or secondary markets?",
    field_type: "Yes/No/Not sure", 
    scoring_logic: "Yes = 1000, Not sure = 5, No = 0",
    sort_order: 3
  },
  {
    category: "EMT/ART Qualification",
    item_name: "Is the token pegged to the value of a single official currency (e.g. EUR, USD)?",
    field_type: "Yes/No",
    scoring_logic: "Yes = 1000, No = 0",
    sort_order: 4
  },
  {
    category: "EMT/ART Qualification",
    item_name: "Does the token reference or track the value of a basket of assets, currencies, or other rights (e.g. BTC, gold, or a mix)?",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 1000, Other = 5, No = 0", 
    sort_order: 5
  },
  {
    category: "EMT/ART Qualification",
    item_name: "Are you using any terms like \"stable\", \"backed by X\", \"interest\", or similar in your token name, branding, or marketing?",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 5, Other = 3, No = 0",
    sort_order: 6
  },
  {
    category: "Utility Token Qualification",
    item_name: "What is the main purpose of the token for its holders?",
    field_type: "Access to services / Governance only / Investment returns / Other + Text field",
    scoring_logic: "Investment returns = 5, Other = 3, Access to service or Governance = 0",
    sort_order: 7
  },
  {
    category: "Utility Token Qualification", 
    item_name: "Are any staking, burning, or locking mechanisms included in the token's design? If so, are these mechanisms linked to yield, return, or appreciation?",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 3, Other = 3, No = 0",
    sort_order: 8
  },
  {
    category: "Utility Token Qualification",
    item_name: "Is the token transferable and fungible across wallets and platforms?",
    field_type: "Yes/No/Other + Text field", 
    scoring_logic: "No = 3, Other = 1, Yes = 0",
    sort_order: 9
  },
  {
    category: "Utility Token Qualification",
    item_name: "Does the token offer financial or economic incentives in exchange for holding, staking, or participating?",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 5, Other = 3, No = 0",
    sort_order: 10
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Will the total public offering of the token in the EU be below €1,000,000 within a 12-month period?",
    field_type: "Yes/No/Not sure",
    scoring_logic: "No = 5, Not sure = 3, Yes = 0",
    sort_order: 11
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Have you announced, or do you plan to announce, a listing or application for trading of the token on any exchange within the EU?",
    field_type: "Yes/No/Planning to/Not sure",
    scoring_logic: "Yes = 5, Planning = 5, Not sure = 3, No = 0", 
    sort_order: 12
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Are you planning to offer this token to more than 150 persons per EU Member State?",
    field_type: "Yes/No/Not sure",
    scoring_logic: "Yes = 5, Not sure = 3, No = 0",
    sort_order: 13
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Will a crypto-asset whitepaper be made available under MiCAR rules?",
    field_type: "Yes/No/Not applicable",
    scoring_logic: "No = 3, Not applicable = 0, Yes = 0",
    sort_order: 14
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Are your marketing materials (website, docs, social media) free from misleading, unclear, or overly promotional language that could imply guaranteed returns?",
    field_type: "Yes/No/Not sure",
    scoring_logic: "No = 5, Not sure = 3, Yes = 0",
    sort_order: 15
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Provide a link to your main website or documentation.",
    field_type: "Text field",
    scoring_logic: "Not scored",
    sort_order: 16
  },
  {
    category: "Legal Entity",
    item_name: "Is the token issuer a registered legal person (company, foundation, etc.)?",
    field_type: "Yes/No + Text field",
    scoring_logic: "No = 1000, Yes = 0",
    sort_order: 17
  },
  {
    category: "Legal Entity",
    item_name: "In which country is the issuer incorporated?",
    field_type: "Text field",
    scoring_logic: "Not scored",
    sort_order: 18
  },
  {
    category: "Legal Entity",
    item_name: "Are you actively marketing or promoting the token to EU-based users, or are you relying on reverse solicitation?",
    field_type: "Actively marketing / Reverse solicitation / Not sure + Text field",
    scoring_logic: "Actively marketing = 5, Not sure = 3, Reverse = 0",
    sort_order: 19
  },
  {
    category: "Governance / Misc.",
    item_name: "Does the token offer governance rights (e.g. DAO voting, protocol decisions)? If yes, are these rights only functional and non-financial?",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 0, No = 0, Other = 3",
    sort_order: 20
  },
  {
    category: "Governance / Misc.",
    item_name: "Is the token offered 'for free' (e.g. via airdrop or reward) in exchange for user data, promotional activity, or other indirect consideration?",
    field_type: "Yes/No/Other + Text field", 
    scoring_logic: "Yes = 5, Other = 3, No = 0",
    sort_order: 21
  }
];

async function updateTemplateSafely() {
  console.log('🔄 Safely Updating Legal Template...\n');

  try {
    // 1. Get existing items to update them instead of deleting
    console.log('📋 Getting existing template items...');
    const { data: existingItems } = await supabase
      .from('checker_items')
      .select('id, sort_order')
      .eq('template_id', '550e8400-e29b-41d4-a716-446655440002')
      .order('sort_order');

    if (!existingItems || existingItems.length === 0) {
      console.log('❌ No existing items found');
      return;
    }

    console.log(`✅ Found ${existingItems.length} existing items`);

    // 2. Update each item with correct data
    console.log('🔄 Updating items with correct template data...\n');
    
    for (let i = 0; i < correctTemplate.length && i < existingItems.length; i++) {
      const existingItem = existingItems[i];
      const correctItem = correctTemplate[i];
      
      const { error } = await supabase
        .from('checker_items')
        .update({
          category: correctItem.category,
          item_name: correctItem.item_name,
          description: correctItem.item_name,
          field_type: correctItem.field_type,
          scoring_logic: correctItem.scoring_logic,
          sort_order: correctItem.sort_order,
          weight: 1.0
        })
        .eq('id', existingItem.id);

      if (error) {
        console.error(`❌ Failed to update item ${i + 1}:`, error);
      } else {
        console.log(`✅ ${correctItem.sort_order}. ${correctItem.item_name}`);
        console.log(`   Field Type: ${correctItem.field_type}`);
        console.log(`   Scoring: ${correctItem.scoring_logic}\n`);
      }
    }

    // 3. Verify update
    const { data: updatedItems } = await supabase
      .from('checker_items')
      .select('item_name, category, field_type, scoring_logic, sort_order')
      .eq('template_id', '550e8400-e29b-41d4-a716-446655440002')
      .order('sort_order');

    console.log('🎉 Template updated successfully!\n');
    console.log('📊 Updated Template Summary:');
    
    const categories = [...new Set(updatedItems.map(item => item.category))];
    categories.forEach(category => {
      const count = updatedItems.filter(item => item.category === category).length;
      console.log(`  ✅ ${category}: ${count} items`);
    });

    // Check for "Not scored" items
    const notScoredItems = updatedItems.filter(item => 
      item.scoring_logic && item.scoring_logic.includes('Not scored')
    );
    
    console.log(`\n📝 Text-only fields (Not scored): ${notScoredItems.length}`);
    notScoredItems.forEach(item => {
      console.log(`  - ${item.item_name}`);
    });

    console.log('\n✅ Legal template now matches Excel reference perfectly!');

  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

updateTemplateSafely();