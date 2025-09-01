import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const legalItems = [
  { category: "MiFID II - Financial Instrument", item_name: "Rights similar to shares/bonds", description: "Does the token grant any rights similar to shares, loans or bonds, such as dividends, voting power, or redemption rights? [Yes/No + Text field if Yes] [Yes = 1000, No = 0]", weight: 1.0, sort_order: 1 },
  { category: "MiFID II - Financial Instrument", item_name: "Derivative structure", description: "Is the token structured in a way that derives its value from the price or performance of another asset or index (i.e. a derivative)? [Yes/No + Text field if Yes] [Yes = 1000, No = 0]", weight: 1.0, sort_order: 2 },
  { category: "MiFID II - Financial Instrument", item_name: "Negotiable securities", description: "Is the token part of a class of securities that are negotiable on financial or secondary markets? [Yes/No/Not sure] [Yes = 1000, Not sure = 5, No = 0]", weight: 1.0, sort_order: 3 },
  { category: "EMT/ART Qualification", item_name: "Single currency peg", description: "Is the token pegged to the value of a single official currency (e.g. EUR, USD)? [Yes/No] [Yes = 1000, No = 0]", weight: 1.0, sort_order: 4 },
  { category: "EMT/ART Qualification", item_name: "Basket of assets reference", description: "Does the token reference or track the value of a basket of assets, currencies, or other rights (e.g. BTC, gold, or a mix)? [Yes/No/Other + Text field] [Yes = 1000, Other = 5, No = 0]", weight: 1.0, sort_order: 5 },
  { category: "EMT/ART Qualification", item_name: "Stable/backed terminology", description: "Are you using any terms like 'stable', 'backed by X', 'interest', or similar in your token name, branding, or marketing? [Yes/No/Other + Text field] [Yes = 5, Other = 3, No = 0]", weight: 1.0, sort_order: 6 },
  { category: "Utility Token Qualification", item_name: "Token main purpose", description: "What is the main purpose of the token for its holders? [Dropdown: Access to services / Governance only / Investment returns / Other + Text field] [Investment returns = 5, Other = 3, Access/Governance = 0]", weight: 1.0, sort_order: 7 },
  { category: "Utility Token Qualification", item_name: "Staking/burning mechanisms", description: "Are any staking, burning, or locking mechanisms included in the token's design? If so, are these mechanisms linked to yield, return, or appreciation? [Yes/No/Other + Text field] [Yes = 3, Other = 3, No = 0]", weight: 1.0, sort_order: 8 },
  { category: "Utility Token Qualification", item_name: "Transferability and fungibility", description: "Is the token transferable and fungible across wallets and platforms? [Yes/No/Other + Text field] [No = 3, Other = 1, Yes = 0]", weight: 1.0, sort_order: 9 },
  { category: "Utility Token Qualification", item_name: "Financial incentives", description: "Does the token offer financial or economic incentives in exchange for holding, staking, or participating? [Yes/No/Other + Text field] [Yes = 5, Other = 3, No = 0]", weight: 1.0, sort_order: 10 },
  { category: "Whitepaper & Marketing", item_name: "EU offering amount", description: "Will the total public offering of the token in the EU be below €1,000,000 within a 12-month period? [Yes/No/Not sure] [No = 5, Not sure = 3, Yes = 0]", weight: 1.0, sort_order: 11 },
  { category: "Whitepaper & Marketing", item_name: "EU exchange listing", description: "Have you announced, or do you plan to announce, a listing or application for trading of the token on any exchange within the EU? [Yes/No/Planning to/Not sure] [Yes = 5, Planning = 5, Not sure = 3, No = 0]", weight: 1.0, sort_order: 12 },
  { category: "Whitepaper & Marketing", item_name: "150+ persons per EU state", description: "Are you planning to offer this token to more than 150 persons per EU Member State? [Yes/No/Not sure] [Yes = 5, Not sure = 3, No = 0]", weight: 1.0, sort_order: 13 },
  { category: "Whitepaper & Marketing", item_name: "MiCAR whitepaper availability", description: "Will a crypto-asset whitepaper be made available under MiCAR rules? [Yes/No/Not applicable] [No = 3, Not applicable = 0, Yes = 0]", weight: 1.0, sort_order: 14 },
  { category: "Whitepaper & Marketing", item_name: "Marketing materials compliance", description: "Are your marketing materials (website, docs, social media) free from misleading, unclear, or overly promotional language that could imply guaranteed returns? [Yes/No/Not sure] [No = 5, Not sure = 3, Yes = 0]", weight: 1.0, sort_order: 15 },
  { category: "Whitepaper & Marketing", item_name: "Website/documentation link", description: "Provide a link to your main website or documentation. [Text field] [Not scored]", weight: 0.0, sort_order: 16 },
  { category: "Legal Entity", item_name: "Registered legal entity", description: "Is the token issuer a registered legal person (company, foundation, etc.)? [Yes/No + Text field] [No = 1000, Yes = 0]", weight: 1.0, sort_order: 17 },
  { category: "Legal Entity", item_name: "Country of incorporation", description: "In which country is the issuer incorporated? [Text field] [Not scored]", weight: 0.0, sort_order: 18 },
  { category: "Legal Entity", item_name: "EU marketing approach", description: "Are you actively marketing or promoting the token to EU-based users, or are you relying on reverse solicitation? [Dropdown: Actively marketing / Reverse solicitation / Not sure + Text field] [Actively marketing = 5, Not sure = 3, Reverse = 0]", weight: 1.0, sort_order: 19 },
  { category: "Governance / Misc.", item_name: "Governance rights", description: "Does the token offer governance rights (e.g. DAO voting, protocol decisions)? If yes, are these rights only functional and non-financial? [Yes/No/Other + Text field] [Yes = 0, No = 0, Other = 3]", weight: 1.0, sort_order: 20 },
  { category: "Governance / Misc.", item_name: "Free token offering", description: "Is the token offered 'for free' (e.g. via airdrop or reward) in exchange for user data, promotional activity, or other indirect consideration? [Yes/No/Other + Text field] [Yes = 5, Other = 3, No = 0]", weight: 1.0, sort_order: 21 }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Find Legal Opinion template
    const { data: template } = await serviceClient
      .from('checker_templates')
      .select('*')
      .eq('type', 'legal')
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Legal Opinion template not found' });
    }

    // Add items to the template
    const itemsWithTemplateId = legalItems.map(item => ({
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
      items_created: items.length,
      message: 'Legal Opinion items restored'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}