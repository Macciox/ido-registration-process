import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MICA_WHITEPAPER_ITEMS = [
  // Part A: Information about the offeror or the person seeking admission to trading
  { category: 'Part A: Offeror Information', item_name: 'Name', description: 'Name of the offeror or person seeking admission to trading', weight: 1.35 },
  { category: 'Part A: Offeror Information', item_name: 'Legal form', description: 'Legal form of the offeror or person seeking admission to trading', weight: 1.35 },
  { category: 'Part A: Offeror Information', item_name: 'Registered address and head office', description: 'Registered address and head office, where different', weight: 1.35 },
  { category: 'Part A: Offeror Information', item_name: 'Date of registration', description: 'Date of the registration', weight: 1.35 },
  { category: 'Part A: Offeror Information', item_name: 'Legal entity identifier', description: 'Legal entity identifier or another identifier required pursuant to applicable national law', weight: 1.35 },
  { category: 'Part A: Offeror Information', item_name: 'Contact information', description: 'A contact telephone number and an email address of the offeror or the person seeking admission to trading, and the period of days within which an investor contacting the offeror or the person seeking admission to trading via that telephone number or email address will receive an answer', weight: 1.35 },
  { category: 'Part A: Offeror Information', item_name: 'Parent company name', description: 'Where applicable, the name of the parent company', weight: 1.35 },
  { category: 'Part A: Offeror Information', item_name: 'Management body members', description: 'Identity, business addresses and functions of persons that are members of the management body of the offeror or person seeking admission to trading', weight: 1.35 },
  { category: 'Part A: Offeror Information', item_name: 'Business activity', description: 'Business or professional activity of the offeror or person seeking admission to trading and, where applicable, of its parent company', weight: 1.35 },
  { category: 'Part A: Offeror Information', item_name: 'Financial condition', description: 'The financial condition of the offeror or person seeking admission to trading over the past three years or where the offeror or person seeking admission to trading has not been established for the past three years, its financial condition since the date of its registration. The financial condition shall be assessed based on a fair review of the development and performance of the business of the offeror or person seeking admission to trading and of its position for each year and interim period for which historical financial information is required, including the causes of material changes. The review shall be a balanced and comprehensive analysis of the development and performance of the business of the offeror or person seeking admission to trading and of its position, consistent with the size and complexity of the business.', weight: 1.35 },

  // Part B: Information about the issuer, if different from the offeror or person seeking admission to trading
  { category: 'Part B: Issuer Information', item_name: 'Issuer name', description: 'Name of the issuer, if different from the offeror or person seeking admission to trading', weight: 1.35 },
  { category: 'Part B: Issuer Information', item_name: 'Issuer legal form', description: 'Legal form of the issuer', weight: 1.35 },
  { category: 'Part B: Issuer Information', item_name: 'Issuer registered address', description: 'Registered address and head office of the issuer, where different', weight: 1.35 },
  { category: 'Part B: Issuer Information', item_name: 'Issuer registration date', description: 'Date of the registration of the issuer', weight: 1.35 },
  { category: 'Part B: Issuer Information', item_name: 'Issuer legal entity identifier', description: 'Legal entity identifier or another identifier required pursuant to applicable national law for the issuer', weight: 1.35 },
  { category: 'Part B: Issuer Information', item_name: 'Issuer parent company', description: 'Where applicable, the name of the parent company of the issuer', weight: 1.35 },
  { category: 'Part B: Issuer Information', item_name: 'Issuer management body', description: 'Identity, business addresses and functions of persons that are members of the management body of the issuer', weight: 1.35 },
  { category: 'Part B: Issuer Information', item_name: 'Issuer business activity', description: 'Business or professional activity of the issuer and, where applicable, of its parent company', weight: 1.35 },

  // Part C: Information about the operator of the trading platform in cases where it draws up the crypto-asset white paper
  { category: 'Part C: Trading Platform Operator', item_name: 'Operator name', description: 'Name of the operator of the trading platform', weight: 1.35 },
  { category: 'Part C: Trading Platform Operator', item_name: 'Operator legal form', description: 'Legal form of the operator', weight: 1.35 },
  { category: 'Part C: Trading Platform Operator', item_name: 'Operator registered address', description: 'Registered address and head office of the operator, where different', weight: 1.35 },
  { category: 'Part C: Trading Platform Operator', item_name: 'Operator registration date', description: 'Date of the registration of the operator', weight: 1.35 },
  { category: 'Part C: Trading Platform Operator', item_name: 'Operator legal entity identifier', description: 'Legal entity identifier or another identifier required pursuant to applicable national law for the operator', weight: 1.35 },
  { category: 'Part C: Trading Platform Operator', item_name: 'Operator parent company', description: 'Where applicable, the name of the parent company of the operator', weight: 1.35 },
  { category: 'Part C: Trading Platform Operator', item_name: 'Reason for white paper preparation', description: 'The reason why that operator drew up the crypto-asset white paper', weight: 1.35 },
  { category: 'Part C: Trading Platform Operator', item_name: 'Operator management body', description: 'Identity, business addresses and functions of persons that are members of the management body of the operator', weight: 1.35 },
  { category: 'Part C: Trading Platform Operator', item_name: 'Operator business activity', description: 'Business or professional activity of the operator and, where applicable, of its parent company', weight: 1.35 },

  // Part D: Information about the crypto-asset project
  { category: 'Part D: Crypto-Asset Project', item_name: 'Project and asset name', description: 'Name of the crypto-asset project and of the crypto-assets, if different from the name of the offeror or person seeking admission to trading, and abbreviation or ticker handler', weight: 1.35 },
  { category: 'Part D: Crypto-Asset Project', item_name: 'Project description', description: 'A brief description of the crypto-asset project', weight: 1.35 },
  { category: 'Part D: Crypto-Asset Project', item_name: 'Project team and advisors', description: 'Details of all natural or legal persons (including business addresses or domicile of the company) involved in the implementation of the crypto-asset project, such as advisors, development team and crypto-asset service providers', weight: 1.35 },
  { category: 'Part D: Crypto-Asset Project', item_name: 'Utility token features', description: 'Where the crypto-asset project concerns utility tokens, key features of the goods or services to be developed', weight: 1.35 },
  { category: 'Part D: Crypto-Asset Project', item_name: 'Project milestones', description: 'Information about the crypto-asset project, especially past and future milestones of the project and, where applicable, resources already allocated to the project', weight: 1.35 },
  { category: 'Part D: Crypto-Asset Project', item_name: 'Use of funds', description: 'Where applicable, planned use of any funds or other crypto-assets collected', weight: 1.35 },

  // Part E: Information about the offer to the public of crypto-assets or their admission to trading
  { category: 'Part E: Offer Information', item_name: 'Offer type indication', description: 'Indication as to whether the crypto-asset white paper concerns an offer to the public of crypto-assets or their admission to trading', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Reasons for offer', description: 'The reasons for the offer to the public or for seeking admission to trading', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Fundraising amount', description: 'Where applicable, the amount that the offer to the public intends to raise in funds or in any other crypto-asset, including, where applicable, any minimum and maximum target subscription goals set for the offer to the public of crypto-assets, and whether oversubscriptions are accepted and how they are allocated', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Issue price', description: 'The issue price of the crypto-asset being offered to the public (in an official currency or any other crypto-assets), any applicable subscription fee or the method in accordance with which the offer price will be determined', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Total number of assets', description: 'Where applicable, the total number of crypto-assets to be offered to the public or admitted to trading', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Target holders', description: 'Indication of the prospective holders targeted by the offer to the public of crypto-assets or admission of such crypto-assets to trading, including any restriction as regards the type of holders for such crypto-assets', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Reimbursement notice', description: 'Specific notice that purchasers participating in the offer to the public of crypto-assets will be able to be reimbursed if the minimum target subscription goal is not reached at the end of the offer to the public, if they exercise the right to withdrawal foreseen in Article 13 or if the offer is cancelled and detailed description of the refund mechanism, including the expected timeline of when such refunds will be completed', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Offer phases', description: 'Information about the various phases of the offer to the public of crypto-assets, including information on discounted purchase price for early purchasers of crypto-assets (pre-public sales); in the case of discounted purchase prices for some purchasers, an explanation why purchase prices may be different, and a description of the impact on the other investors', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Subscription period', description: 'For time-limited offers, the subscription period during which the offer to the public is open', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Safeguarding arrangements', description: 'The arrangements to safeguard funds or other crypto-assets as referred to in Article 10 during the time-limited offer to the public or during the withdrawal period', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Payment methods', description: 'Methods of payment to purchase the crypto-assets offered and methods of transfer of the value to the purchasers when they are entitled to be reimbursed', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Right of withdrawal', description: 'In the case of offers to the public, information on the right of withdrawal as referred to in Article 13', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Transfer schedule', description: 'Information on the manner and time schedule of transferring the purchased crypto-assets to the holders', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Technical requirements', description: 'Information about technical requirements that the purchaser is required to fulfil to hold the crypto-assets', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Placing service provider', description: 'Where applicable, the name of the crypto-asset service provider in charge of the placing of crypto-assets and the form of such placement (with or without a firm commitment basis)', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Trading platform information', description: 'Where applicable, the name of the trading platform for crypto-assets where admission to trading is sought, and information about how investors can access such trading platforms and the costs involved', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Offer expenses', description: 'Expenses related to the offer to the public of crypto-assets', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Conflicts of interest', description: 'Potential conflicts of interest of the persons involved in the offer to the public or admission to trading, arising in relation to the offer or admission to trading', weight: 1.35 },
  { category: 'Part E: Offer Information', item_name: 'Applicable law', description: 'The law applicable to the offer to the public of crypto-assets, as well as the competent court', weight: 1.35 },

  // Part F: Information about the crypto-assets
  { category: 'Part F: Crypto-Asset Details', item_name: 'Asset type', description: 'The type of crypto-asset that will be offered to the public or for which admission to trading is sought', weight: 1.35 },
  { category: 'Part F: Crypto-Asset Details', item_name: 'Asset characteristics', description: 'A description of the characteristics, including the data necessary for classification of the crypto-asset white paper in the register referred to in Article 109, as specified in accordance with paragraph 8 of that Article, and functionality of the crypto-assets being offered or admitted to trading, including information about when the functionalities are planned to apply', weight: 1.35 },

  // Part G: Information on the rights and obligations attached to the crypto-assets
  { category: 'Part G: Rights and Obligations', item_name: 'Rights and obligations description', description: 'A description of the rights and obligations, if any, of the purchaser, and the procedure and conditions for the exercise of those rights', weight: 1.35 },
  { category: 'Part G: Rights and Obligations', item_name: 'Modification conditions', description: 'A description of the conditions under which the rights and obligations may be modified', weight: 1.35 },
  { category: 'Part G: Rights and Obligations', item_name: 'Future offers information', description: 'Where applicable, information on the future offers to the public of crypto-assets by the issuer and the number of crypto-assets retained by the issuer itself', weight: 1.35 },
  { category: 'Part G: Rights and Obligations', item_name: 'Utility token access', description: 'Where the offer to the public of crypto-assets or their admission to trading concerns utility tokens, information about the quality and quantity of goods or services to which the utility tokens give access', weight: 1.35 },
  { category: 'Part G: Rights and Obligations', item_name: 'Utility token redemption', description: 'Where the offers to the public of crypto-assets or their admission to trading concerns utility tokens, information on how utility tokens can be redeemed for goods or services to which they relate', weight: 1.35 },
  { category: 'Part G: Rights and Obligations', item_name: 'Trading information', description: 'Where an admission to trading is not sought, information on how and where the crypto-assets can be purchased or sold after the offer to the public', weight: 1.35 },
  { category: 'Part G: Rights and Obligations', item_name: 'Transferability restrictions', description: 'Restrictions on the transferability of the crypto-assets that are being offered or admitted to trading', weight: 1.35 },
  { category: 'Part G: Rights and Obligations', item_name: 'Supply protocols', description: 'Where the crypto-assets have protocols for the increase or decrease of their supply in response to changes in demand, a description of the functioning of such protocols', weight: 1.35 },
  { category: 'Part G: Rights and Obligations', item_name: 'Protection schemes', description: 'Where applicable, a description of protection schemes protecting the value of the crypto-assets and of compensation schemes', weight: 1.35 },
  { category: 'Part G: Rights and Obligations', item_name: 'Asset applicable law', description: 'The law applicable to the crypto-assets, as well as the competent court', weight: 1.35 },

  // Part H: Information on the underlying technology
  { category: 'Part H: Technology Information', item_name: 'Technology description', description: 'Information on the technology used, including distributed ledger technology, protocols and technical standards used', weight: 1.35 },
  { category: 'Part H: Technology Information', item_name: 'Consensus mechanism', description: 'The consensus mechanism, where applicable', weight: 1.35 },
  { category: 'Part H: Technology Information', item_name: 'Incentive mechanisms', description: 'Incentive mechanisms to secure transactions and any fees applicable', weight: 1.35 },
  { category: 'Part H: Technology Information', item_name: 'DLT operation details', description: 'Where the crypto-assets are issued, transferred and stored using distributed ledger technology that is operated by the issuer, the offeror or a third-party acting on their behalf, a detailed description of the functioning of such distributed ledger technology', weight: 1.35 },
  { category: 'Part H: Technology Information', item_name: 'Technology audit', description: 'Information on the audit outcome of the technology used, if such an audit was conducted', weight: 1.35 },

  // Part I: Information on the risks
  { category: 'Part I: Risk Information', item_name: 'Offer risks', description: 'A description of the risks associated with the offer to the public of crypto-assets or their admission to trading', weight: 1.35 },
  { category: 'Part I: Risk Information', item_name: 'Issuer risks', description: 'A description of the risks associated with the issuer, if different from the offeror, or person seeking admission to trading', weight: 1.35 },
  { category: 'Part I: Risk Information', item_name: 'Asset risks', description: 'A description of the risks associated with the crypto-assets', weight: 1.35 },
  { category: 'Part I: Risk Information', item_name: 'Implementation risks', description: 'A description of the risks associated with project implementation', weight: 1.35 },
  { category: 'Part I: Risk Information', item_name: 'Technology risks', description: 'A description of the risks associated with the technology used as well as mitigation measures, if any', weight: 1.35 }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting MiCA Whitepaper template update...');

    // Find the Whitepaper MiCA template
    const { data: template, error: templateError } = await serviceClient
      .from('checker_templates')
      .select('id')
      .ilike('name', '%Whitepaper%MiCA%')
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Whitepaper MiCA template not found' });
    }

    console.log('Found template:', template.id);

    // Delete existing items
    const { error: deleteError } = await serviceClient
      .from('checker_items')
      .delete()
      .eq('template_id', template.id);

    if (deleteError) {
      console.error('Error deleting old items:', deleteError);
      return res.status(500).json({ error: 'Failed to delete old items' });
    }

    console.log('Deleted old items');

    // Insert new MiCA items
    const itemsToInsert = MICA_WHITEPAPER_ITEMS.map(item => ({
      template_id: template.id,
      category: item.category,
      item_name: item.item_name,
      description: item.description,
      weight: item.weight
    }));

    const { error: insertError } = await serviceClient
      .from('checker_items')
      .insert(itemsToInsert);

    if (insertError) {
      console.error('Error inserting new items:', insertError);
      return res.status(500).json({ error: 'Failed to insert new items' });
    }

    console.log(`Successfully updated template with ${MICA_WHITEPAPER_ITEMS.length} items`);

    res.status(200).json({
      success: true,
      message: `Successfully updated Whitepaper MiCA template with ${MICA_WHITEPAPER_ITEMS.length} official MiCA items`,
      itemsCount: MICA_WHITEPAPER_ITEMS.length
    });

  } catch (error: any) {
    console.error('Update error:', error);
    res.status(500).json({ 
      error: 'Failed to update template',
      details: error.message 
    });
  }
}