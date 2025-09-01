import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const whitepaperItems = [
  { category: "Part A: Information about the offeror", item_name: "Name", description: "Name of the offeror or person seeking admission to trading", weight: 1.0, sort_order: 1 },
  { category: "Part A: Information about the offeror", item_name: "Legal form", description: "Legal form of the entity", weight: 1.0, sort_order: 2 },
  { category: "Part A: Information about the offeror", item_name: "Registered address", description: "Registered address and head office, where different", weight: 1.0, sort_order: 3 },
  { category: "Part A: Information about the offeror", item_name: "Date of registration", description: "Date of the registration", weight: 1.0, sort_order: 4 },
  { category: "Part A: Information about the offeror", item_name: "Legal entity identifier", description: "Legal entity identifier or another identifier required pursuant to applicable national law", weight: 1.0, sort_order: 5 },
  { category: "Part A: Information about the offeror", item_name: "Contact information", description: "Contact telephone number and email address, and response period", weight: 1.0, sort_order: 6 },
  { category: "Part A: Information about the offeror", item_name: "Parent company", description: "Where applicable, the name of the parent company", weight: 1.0, sort_order: 7 },
  { category: "Part A: Information about the offeror", item_name: "Management body", description: "Identity, business addresses and functions of management body members", weight: 1.0, sort_order: 8 },
  { category: "Part A: Information about the offeror", item_name: "Business activity", description: "Business or professional activity of the offeror and parent company", weight: 1.0, sort_order: 9 },
  { category: "Part A: Information about the offeror", item_name: "Financial condition", description: "Financial condition over the past three years with comprehensive analysis", weight: 1.0, sort_order: 10 },
  
  { category: "Part B: Information about the issuer", item_name: "Issuer name", description: "Name of the issuer, if different from the offeror", weight: 1.0, sort_order: 11 },
  { category: "Part B: Information about the issuer", item_name: "Issuer legal form", description: "Legal form of the issuer", weight: 1.0, sort_order: 12 },
  { category: "Part B: Information about the issuer", item_name: "Issuer address", description: "Registered address and head office of the issuer", weight: 1.0, sort_order: 13 },
  { category: "Part B: Information about the issuer", item_name: "Issuer registration date", description: "Date of the issuer registration", weight: 1.0, sort_order: 14 },
  { category: "Part B: Information about the issuer", item_name: "Issuer identifier", description: "Legal entity identifier of the issuer", weight: 1.0, sort_order: 15 },
  { category: "Part B: Information about the issuer", item_name: "Issuer parent company", description: "Name of the issuer parent company", weight: 1.0, sort_order: 16 },
  { category: "Part B: Information about the issuer", item_name: "Issuer management", description: "Identity and functions of issuer management body members", weight: 1.0, sort_order: 17 },
  { category: "Part B: Information about the issuer", item_name: "Issuer business activity", description: "Business activity of the issuer and parent company", weight: 1.0, sort_order: 18 },
  
  { category: "Part D: Crypto-asset project", item_name: "Project name", description: "Name of the crypto-asset project and ticker", weight: 1.0, sort_order: 19 },
  { category: "Part D: Crypto-asset project", item_name: "Project description", description: "Brief description of the crypto-asset project", weight: 1.0, sort_order: 20 },
  { category: "Part D: Crypto-asset project", item_name: "Project team", description: "Details of persons involved in project implementation", weight: 1.0, sort_order: 21 },
  { category: "Part D: Crypto-asset project", item_name: "Utility token features", description: "Key features of goods or services for utility tokens", weight: 1.0, sort_order: 22 },
  { category: "Part D: Crypto-asset project", item_name: "Project milestones", description: "Past and future milestones and allocated resources", weight: 1.0, sort_order: 23 },
  { category: "Part D: Crypto-asset project", item_name: "Fund usage", description: "Planned use of collected funds or crypto-assets", weight: 1.0, sort_order: 24 },
  
  { category: "Part E: Offer information", item_name: "Offer type", description: "Whether concerning public offer or admission to trading", weight: 1.0, sort_order: 25 },
  { category: "Part E: Offer information", item_name: "Offer reasons", description: "Reasons for the public offer or admission to trading", weight: 1.0, sort_order: 26 },
  { category: "Part E: Offer information", item_name: "Fundraising amount", description: "Amount to raise and subscription goals", weight: 1.0, sort_order: 27 },
  { category: "Part E: Offer information", item_name: "Issue price", description: "Issue price and pricing methodology", weight: 1.0, sort_order: 28 },
  { category: "Part E: Offer information", item_name: "Total supply", description: "Total number of crypto-assets offered", weight: 1.0, sort_order: 29 },
  { category: "Part E: Offer information", item_name: "Target holders", description: "Prospective holders and restrictions", weight: 1.0, sort_order: 30 },
  
  { category: "Part F: Crypto-assets information", item_name: "Asset type", description: "Type of crypto-asset offered", weight: 1.0, sort_order: 31 },
  { category: "Part F: Crypto-assets information", item_name: "Asset characteristics", description: "Characteristics and functionality of crypto-assets", weight: 1.0, sort_order: 32 },
  
  { category: "Part G: Rights and obligations", item_name: "Purchaser rights", description: "Rights and obligations of purchasers", weight: 1.0, sort_order: 33 },
  { category: "Part G: Rights and obligations", item_name: "Rights modification", description: "Conditions for modifying rights and obligations", weight: 1.0, sort_order: 34 },
  { category: "Part G: Rights and obligations", item_name: "Future offers", description: "Information on future offers and retained assets", weight: 1.0, sort_order: 35 },
  { category: "Part G: Rights and obligations", item_name: "Utility token access", description: "Quality and quantity of goods/services for utility tokens", weight: 1.0, sort_order: 36 },
  { category: "Part G: Rights and obligations", item_name: "Token redemption", description: "How utility tokens can be redeemed", weight: 1.0, sort_order: 37 },
  { category: "Part G: Rights and obligations", item_name: "Trading information", description: "How and where tokens can be traded", weight: 1.0, sort_order: 38 },
  { category: "Part G: Rights and obligations", item_name: "Transfer restrictions", description: "Restrictions on transferability", weight: 1.0, sort_order: 39 },
  { category: "Part G: Rights and obligations", item_name: "Supply protocols", description: "Protocols for supply increase/decrease", weight: 1.0, sort_order: 40 },
  
  { category: "Part H: Technology information", item_name: "Technology used", description: "Information on distributed ledger technology and protocols", weight: 1.0, sort_order: 41 },
  { category: "Part H: Technology information", item_name: "Consensus mechanism", description: "Consensus mechanism description", weight: 1.0, sort_order: 42 },
  { category: "Part H: Technology information", item_name: "Incentive mechanisms", description: "Incentive mechanisms and fees", weight: 1.0, sort_order: 43 },
  { category: "Part H: Technology information", item_name: "DLT functioning", description: "Detailed description of DLT functioning", weight: 1.0, sort_order: 44 },
  { category: "Part H: Technology information", item_name: "Technology audit", description: "Information on technology audit outcomes", weight: 1.0, sort_order: 45 },
  
  { category: "Part I: Risk information", item_name: "Offer risks", description: "Risks associated with the offer or admission to trading", weight: 1.0, sort_order: 46 },
  { category: "Part I: Risk information", item_name: "Issuer risks", description: "Risks associated with the issuer", weight: 1.0, sort_order: 47 },
  { category: "Part I: Risk information", item_name: "Asset risks", description: "Risks associated with the crypto-assets", weight: 1.0, sort_order: 48 },
  { category: "Part I: Risk information", item_name: "Implementation risks", description: "Risks associated with project implementation", weight: 1.0, sort_order: 49 },
  { category: "Part I: Risk information", item_name: "Technology risks", description: "Risks associated with technology and mitigation measures", weight: 1.0, sort_order: 50 }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Find Whitepaper template
    const { data: template } = await serviceClient
      .from('checker_templates')
      .select('*')
      .eq('type', 'whitepaper')
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Whitepaper template not found' });
    }

    // Delete existing items
    await serviceClient
      .from('checker_items')
      .delete()
      .eq('template_id', template.id);

    // Add new items
    const itemsWithTemplateId = whitepaperItems.map(item => ({
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
      message: 'Whitepaper template updated with 50 items'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}