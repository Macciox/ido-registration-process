-- Update legal template items with correct field_type and scoring_logic
UPDATE checker_items SET 
  field_type = 'Yes/No + Text field if Yes',
  scoring_logic = 'Yes = 1000, No = 0'
WHERE item_name = 'Does the token grant any rights similar to shares, loans or bonds, such as dividends, voting power, or redemption rights?';

UPDATE checker_items SET 
  field_type = 'Yes/No + Text field if Yes',
  scoring_logic = 'Yes = 1000, No = 0'
WHERE item_name = 'Is the token structured in a way that derives its value from the price or performance of another asset or index (i.e. a derivative)?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Not sure',
  scoring_logic = 'Yes = 1000, Not sure = 5, No = 0'
WHERE item_name = 'Is the token part of a class of securities that are negotiable on financial or secondary markets?';

UPDATE checker_items SET 
  field_type = 'Yes/No',
  scoring_logic = 'Yes = 1000, No = 0'
WHERE item_name = 'Is the token pegged to the value of a single official currency (e.g. EUR, USD)?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Other + Text field',
  scoring_logic = 'Yes = 1000, Other = 5, No = 0'
WHERE item_name = 'Does the token reference or track the value of a basket of assets, currencies, or other rights (e.g. BTC, gold, or a mix)?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Other + Text field',
  scoring_logic = 'Yes = 5, Other = 3, No = 0'
WHERE item_name = 'Are you using any terms like "stable", "backed by X", "interest", or similar in your token name, branding, or marketing?';

UPDATE checker_items SET 
  field_type = 'Dropdown: Access to services / Governance only / Investment returns / Other + Text field',
  scoring_logic = 'Investment returns = 5, Other = 3, Access/Governance = 0'
WHERE item_name = 'What is the main purpose of the token for its holders?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Other + Text field',
  scoring_logic = 'Yes = 3, Other = 3, No = 0'
WHERE item_name = 'Are any staking, burning, or locking mechanisms included in the token''s design? If so, are these mechanisms linked to yield, return, or appreciation?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Other + Text field',
  scoring_logic = 'No = 3, Other = 1, Yes = 0'
WHERE item_name = 'Is the token transferable and fungible across wallets and platforms?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Other + Text field',
  scoring_logic = 'Yes = 5, Other = 3, No = 0'
WHERE item_name = 'Does the token offer financial or economic incentives in exchange for holding, staking, or participating?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Not sure',
  scoring_logic = 'No = 5, Not sure = 3, Yes = 0'
WHERE item_name = 'Will the total public offering of the token in the EU be below €1,000,000 within a 12-month period?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Planning to/Not sure',
  scoring_logic = 'Yes = 5, Planning = 5, Not sure = 3, No = 0'
WHERE item_name = 'Have you announced, or do you plan to announce, a listing or application for trading of the token on any exchange within the EU?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Not sure',
  scoring_logic = 'Yes = 5, Not sure = 3, No = 0'
WHERE item_name = 'Are you planning to offer this token to more than 150 persons per EU Member State?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Not applicable',
  scoring_logic = 'No = 3, Not applicable = 0, Yes = 0'
WHERE item_name = 'Will a crypto-asset whitepaper be made available under MiCAR rules?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Not sure',
  scoring_logic = 'No = 5, Not sure = 3, Yes = 0'
WHERE item_name = 'Are your marketing materials (website, docs, social media) free from misleading, unclear, or overly promotional language that could imply guaranteed returns?';

UPDATE checker_items SET 
  field_type = 'Text field',
  scoring_logic = 'Not scored'
WHERE item_name = 'Provide a link to your main website or documentation.';

UPDATE checker_items SET 
  field_type = 'Yes/No + Text field',
  scoring_logic = 'No = 1000, Yes = 0'
WHERE item_name = 'Is the token issuer a registered legal person (company, foundation, etc.)?';

UPDATE checker_items SET 
  field_type = 'Text field',
  scoring_logic = 'Not scored'
WHERE item_name = 'In which country is the issuer incorporated?';

UPDATE checker_items SET 
  field_type = 'Dropdown: Actively marketing / Reverse solicitation / Not sure + Text field',
  scoring_logic = 'Actively marketing = 5, Not sure = 3, Reverse = 0'
WHERE item_name = 'Are you actively marketing or promoting the token to EU-based users, or are you relying on reverse solicitation?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Other + Text field',
  scoring_logic = 'Yes = 0, No = 0, Other = 3'
WHERE item_name = 'Does the token offer governance rights (e.g. DAO voting, protocol decisions)? If yes, are these rights only functional and non-financial?';

UPDATE checker_items SET 
  field_type = 'Yes/No/Other + Text field',
  scoring_logic = 'Yes = 5, Other = 3, No = 0'
WHERE item_name = 'Is the token offered ''for free'' (e.g. via airdrop or reward) in exchange for user data, promotional activity, or other indirect consideration?';