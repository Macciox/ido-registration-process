-- Update Legal Opinion template with correct scoring system
UPDATE checker_items 
SET 
  description = CASE item_name
    WHEN 'Financial Instrument - Rights' THEN 'Does the token grant any rights similar to shares, loans or bonds, such as dividends, voting power, or redemption rights? (Yes = 1000, No = 0)'
    WHEN 'Financial Instrument - Derivative' THEN 'Is the token structured in a way that derives its value from the price or performance of another asset or index (i.e. a derivative)? (Yes = 1000, No = 0)'
    WHEN 'Financial Instrument - Securities Class' THEN 'Is the token part of a class of securities that are negotiable on financial or secondary markets? (Yes = 1000, Not sure = 5, No = 0)'
    WHEN 'EMT - Single Currency Peg' THEN 'Is the token pegged to the value of a single official currency (e.g. EUR, USD)? (Yes = 1000, No = 0)'
    WHEN 'ART - Basket Reference' THEN 'Does the token reference or track the value of a basket of assets, currencies, or other rights (e.g. BTC, gold, or a mix)? (Yes = 1000, Other = 5, No = 0)'
    WHEN 'Marketing - Stable Terms' THEN 'Are you using any terms like "stable", "backed by X", "interest", or similar in your token name, branding, or marketing? (Yes = 5, Other = 3, No = 0)'
    WHEN 'Utility - Main Purpose' THEN 'What is the main purpose of the token for its holders? (Investment returns = 5, Other = 3, Access/Governance = 0)'
    WHEN 'Utility - Staking Mechanisms' THEN 'Are any staking, burning, or locking mechanisms included in the token design? If so, are these mechanisms linked to yield, return, or appreciation? (Yes = 3, Other = 3, No = 0)'
    WHEN 'Utility - Transferability' THEN 'Is the token transferable and fungible across wallets and platforms? (No = 3, Other = 1, Yes = 0)'
    WHEN 'Utility - Financial Incentives' THEN 'Does the token offer financial or economic incentives in exchange for holding, staking, or participating? (Yes = 5, Other = 3, No = 0)'
    WHEN 'Offering - EU Amount' THEN 'Will the total public offering of the token in the EU be below €1,000,000 within a 12-month period? (No = 5, Not sure = 3, Yes = 0)'
    WHEN 'Offering - Exchange Listing' THEN 'Have you announced, or do you plan to announce, a listing or application for trading of the token on any exchange within the EU? (Yes = 5, Planning = 5, Not sure = 3, No = 0)'
    WHEN 'Offering - Person Count' THEN 'Are you planning to offer this token to more than 150 persons per EU Member State? (Yes = 5, Not sure = 3, No = 0)'
    WHEN 'Whitepaper - MiCAR' THEN 'Will a crypto-asset whitepaper be made available under MiCAR rules? (No = 3, Not applicable = 0, Yes = 0)'
    WHEN 'Marketing - Misleading Language' THEN 'Are your marketing materials (website, docs, social media) free from misleading, unclear, or overly promotional language that could imply guaranteed returns? (No = 5, Not sure = 3, Yes = 0)'
    WHEN 'Documentation - Website Link' THEN 'Provide a link to your main website or documentation. (Not scored)'
    WHEN 'Legal Entity - Registration' THEN 'Is the token issuer a registered legal person (company, foundation, etc.)? (No = 1000, Yes = 0)'
    WHEN 'Legal Entity - Country' THEN 'In which country is the issuer incorporated? (Not scored)'
    WHEN 'Marketing - EU Targeting' THEN 'Are you actively marketing or promoting the token to EU-based users, or are you relying on reverse solicitation? (Actively marketing = 5, Not sure = 3, Reverse = 0)'
    WHEN 'Governance - Rights' THEN 'Does the token offer governance rights (e.g. DAO voting, protocol decisions)? If yes, are these rights only functional and non-financial? (Yes = 0, No = 0, Other = 3)'
    WHEN 'Token - Free Distribution' THEN 'Is the token offered "for free" (e.g. via airdrop or reward) in exchange for user data, promotional activity, or other indirect consideration? (Yes = 5, Other = 3, No = 0)'
    ELSE description
  END,
  weight = CASE item_name
    WHEN 'Financial Instrument - Rights' THEN 1000
    WHEN 'Financial Instrument - Derivative' THEN 1000
    WHEN 'Financial Instrument - Securities Class' THEN 1000
    WHEN 'EMT - Single Currency Peg' THEN 1000
    WHEN 'ART - Basket Reference' THEN 1000
    WHEN 'Legal Entity - Registration' THEN 1000
    WHEN 'Marketing - Stable Terms' THEN 5
    WHEN 'Utility - Main Purpose' THEN 5
    WHEN 'Utility - Financial Incentives' THEN 5
    WHEN 'Offering - EU Amount' THEN 5
    WHEN 'Offering - Exchange Listing' THEN 5
    WHEN 'Offering - Person Count' THEN 5
    WHEN 'Marketing - Misleading Language' THEN 5
    WHEN 'Marketing - EU Targeting' THEN 5
    WHEN 'Token - Free Distribution' THEN 5
    WHEN 'Utility - Staking Mechanisms' THEN 3
    WHEN 'Whitepaper - MiCAR' THEN 3
    WHEN 'Governance - Rights' THEN 3
    WHEN 'Utility - Transferability' THEN 3
    WHEN 'Documentation - Website Link' THEN 0
    WHEN 'Legal Entity - Country' THEN 0
    ELSE 1
  END
WHERE template_id = (SELECT id FROM checker_templates WHERE name LIKE '%Legal%');