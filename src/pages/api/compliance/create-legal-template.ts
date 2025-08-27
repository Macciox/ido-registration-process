import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const legalOpinionItems = [
  {
    category: "MiFID II - Financial Instrument",
    item_name: "Does the token grant any rights similar to shares, loans or bonds, such as dividends, voting power, or redemption rights?",
    description: "Rights similar to shares/bonds",
    field_type: "Yes/No + Text field if Yes",
    scoring_logic: "Yes = 1000, No = 0",
    weight: 1.0,
    sort_order: 1
  },
  {
    category: "MiFID II - Financial Instrument", 
    item_name: "Is the token structured in a way that derives its value from the price or performance of another asset or index (i.e. a derivative)?",
    description: "Derivative structure",
    field_type: "Yes/No + Text field if Yes",
    scoring_logic: "Yes = 1000, No = 0",
    weight: 1.0,
    sort_order: 2
  },
  {
    category: "MiFID II - Financial Instrument",
    item_name: "Is the token part of a class of securities that are negotiable on financial or secondary markets?",
    description: "Negotiable securities",
    field_type: "Yes/No/Not sure",
    scoring_logic: "Yes = 1000, Not sure = 5, No = 0",
    weight: 1.0,
    sort_order: 3
  },
  {
    category: "EMT/ART Qualification",
    item_name: "Is the token pegged to the value of a single official currency (e.g. EUR, USD)?",
    description: "Single currency peg",
    field_type: "Yes/No",
    scoring_logic: "Yes = 1000, No = 0",
    weight: 1.0,
    sort_order: 4
  },
  {
    category: "EMT/ART Qualification",
    item_name: "Does the token reference or track the value of a basket of assets, currencies, or other rights (e.g. BTC, gold, or a mix)?",
    description: "Basket of assets reference",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 1000, Other = 5, No = 0",
    weight: 1.0,
    sort_order: 5
  },
  {
    category: "EMT/ART Qualification",
    item_name: "Are you using any terms like \"stable\", \"backed by X\", \"interest\", or similar in your token name, branding, or marketing?",
    description: "Stable/backed terminology",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 5, Other = 3, No = 0",
    weight: 1.0,
    sort_order: 6
  },
  {
    category: "Utility Token Qualification",
    item_name: "What is the main purpose of the token for its holders?",
    description: "Token main purpose",
    field_type: "Dropdown: Access to services / Governance only / Investment returns / Other + Text field",
    scoring_logic: "Investment returns = 5, Other = 3, Access/Governance = 0",
    weight: 1.0,
    sort_order: 7
  },
  {
    category: "Utility Token Qualification",
    item_name: "Are any staking, burning, or locking mechanisms included in the token's design? If so, are these mechanisms linked to yield, return, or appreciation?",
    description: "Staking/burning mechanisms",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 3, Other = 3, No = 0",
    weight: 1.0,
    sort_order: 8
  },
  {
    category: "Utility Token Qualification",
    item_name: "Is the token transferable and fungible across wallets and platforms?",
    description: "Transferability and fungibility",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "No = 3, Other = 1, Yes = 0",
    weight: 1.0,
    sort_order: 9
  },
  {
    category: "Utility Token Qualification",
    item_name: "Does the token offer financial or economic incentives in exchange for holding, staking, or participating?",
    description: "Financial incentives",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 5, Other = 3, No = 0",
    weight: 1.0,
    sort_order: 10
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Will the total public offering of the token in the EU be below €1,000,000 within a 12-month period?",
    description: "EU offering amount",
    field_type: "Yes/No/Not sure",
    scoring_logic: "No = 5, Not sure = 3, Yes = 0",
    weight: 1.0,
    sort_order: 11
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Have you announced, or do you plan to announce, a listing or application for trading of the token on any exchange within the EU?",
    description: "EU exchange listing",
    field_type: "Yes/No/Planning to/Not sure",
    scoring_logic: "Yes = 5, Planning = 5, Not sure = 3, No = 0",
    weight: 1.0,
    sort_order: 12
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Are you planning to offer this token to more than 150 persons per EU Member State?",
    description: "150+ persons per EU state",
    field_type: "Yes/No/Not sure",
    scoring_logic: "Yes = 5, Not sure = 3, No = 0",
    weight: 1.0,
    sort_order: 13
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Will a crypto-asset whitepaper be made available under MiCAR rules?",
    description: "MiCAR whitepaper availability",
    field_type: "Yes/No/Not applicable",
    scoring_logic: "No = 3, Not applicable = 0, Yes = 0",
    weight: 1.0,
    sort_order: 14
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Are your marketing materials (website, docs, social media) free from misleading, unclear, or overly promotional language that could imply guaranteed returns?",
    description: "Marketing materials compliance",
    field_type: "Yes/No/Not sure",
    scoring_logic: "No = 5, Not sure = 3, Yes = 0",
    weight: 1.0,
    sort_order: 15
  },
  {
    category: "Whitepaper & Marketing",
    item_name: "Provide a link to your main website or documentation.",
    description: "Website/documentation link",
    field_type: "Text field",
    scoring_logic: "Not scored",
    weight: 0.0,
    sort_order: 16
  },
  {
    category: "Legal Entity",
    item_name: "Is the token issuer a registered legal person (company, foundation, etc.)?",
    description: "Registered legal entity",
    field_type: "Yes/No + Text field",
    scoring_logic: "No = 1000, Yes = 0",
    weight: 1.0,
    sort_order: 17
  },
  {
    category: "Legal Entity",
    item_name: "In which country is the issuer incorporated?",
    description: "Country of incorporation",
    field_type: "Text field",
    scoring_logic: "Not scored",
    weight: 0.0,
    sort_order: 18
  },
  {
    category: "Legal Entity",
    item_name: "Are you actively marketing or promoting the token to EU-based users, or are you relying on reverse solicitation?",
    description: "EU marketing approach",
    field_type: "Dropdown: Actively marketing / Reverse solicitation / Not sure + Text field",
    scoring_logic: "Actively marketing = 5, Not sure = 3, Reverse = 0",
    weight: 1.0,
    sort_order: 19
  },
  {
    category: "Governance / Misc.",
    item_name: "Does the token offer governance rights (e.g. DAO voting, protocol decisions)? If yes, are these rights only functional and non-financial?",
    description: "Governance rights",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 0, No = 0, Other = 3",
    weight: 1.0,
    sort_order: 20
  },
  {
    category: "Governance / Misc.",
    item_name: "Is the token offered 'for free' (e.g. via airdrop or reward) in exchange for user data, promotional activity, or other indirect consideration?",
    description: "Free token offering",
    field_type: "Yes/No/Other + Text field",
    scoring_logic: "Yes = 5, Other = 3, No = 0",
    weight: 1.0,
    sort_order: 21
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Find existing Legal Opinion template
    const { data: template, error: templateError } = await serviceClient
      .from('checker_templates')
      .select('*')
      .eq('type', 'legal')
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Legal Opinion template not found' });
    }

    // Delete existing items
    await serviceClient
      .from('checker_items')
      .delete()
      .eq('template_id', template.id);

    // Add all items to the template
    const itemsWithTemplateId = legalOpinionItems.map(item => ({
      ...item,
      template_id: template.id
    }));

    const { data: items, error: itemsError } = await serviceClient
      .from('checker_items')
      .insert(itemsWithTemplateId)
      .select();

    if (itemsError) {
      return res.status(500).json({ error: itemsError.message });
    }

    res.status(200).json({ 
      success: true, 
      template,
      items_created: items.length,
      message: 'Legal Opinion template updated successfully'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}