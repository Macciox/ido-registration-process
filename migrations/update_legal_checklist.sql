-- Replace existing legal checklist with new Legal Opinion items
DELETE FROM checker_items WHERE template_id = '550e8400-e29b-41d4-a716-446655440002';

-- Update template description
UPDATE checker_templates 
SET name = 'Legal Opinion MiCA v1', 
    description = 'Legal Opinion compliance checker with risk scoring for MiCA regulation'
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

-- Insert new Legal Opinion checklist items
INSERT INTO checker_items (id, template_id, category, item_name, description, weight, sort_order) VALUES
-- MiFID II - Financial Instrument
('550e8400-e29b-41d4-a716-446655440801', '550e8400-e29b-41d4-a716-446655440002', 'MiFID II - Financial Instrument', 'Rights similar to shares/bonds', 'Does the token grant any rights similar to shares, loans or bonds, such as dividends, voting power, or redemption rights?', 1000.0, 1),
('550e8400-e29b-41d4-a716-446655440802', '550e8400-e29b-41d4-a716-446655440002', 'MiFID II - Financial Instrument', 'Derivative structure', 'Is the token structured in a way that derives its value from the price or performance of another asset or index (i.e. a derivative)?', 1000.0, 2),
('550e8400-e29b-41d4-a716-446655440803', '550e8400-e29b-41d4-a716-446655440002', 'MiFID II - Financial Instrument', 'Negotiable securities', 'Is the token part of a class of securities that are negotiable on financial or secondary markets?', 1000.0, 3),

-- EMT/ART Qualification
('550e8400-e29b-41d4-a716-446655440804', '550e8400-e29b-41d4-a716-446655440002', 'EMT/ART Qualification', 'Single currency peg', 'Is the token pegged to the value of a single official currency (e.g. EUR, USD)?', 1000.0, 4),
('550e8400-e29b-41d4-a716-446655440805', '550e8400-e29b-41d4-a716-446655440002', 'EMT/ART Qualification', 'Basket of assets reference', 'Does the token reference or track the value of a basket of assets, currencies, or other rights (e.g. BTC, gold, or a mix)?', 1000.0, 5),
('550e8400-e29b-41d4-a716-446655440806', '550e8400-e29b-41d4-a716-446655440002', 'EMT/ART Qualification', 'Stable/backed terminology', 'Are you using any terms like "stable", "backed by X", "interest", or similar in your token name, branding, or marketing?', 5.0, 6),

-- Utility Token Qualification
('550e8400-e29b-41d4-a716-446655440807', '550e8400-e29b-41d4-a716-446655440002', 'Utility Token Qualification', 'Main token purpose', 'What is the main purpose of the token for its holders? (Access to services / Governance only / Investment returns / Other)', 5.0, 7),
('550e8400-e29b-41d4-a716-446655440808', '550e8400-e29b-41d4-a716-446655440002', 'Utility Token Qualification', 'Staking/burning mechanisms', 'Are any staking, burning, or locking mechanisms included in the token design? Are these mechanisms linked to yield, return, or appreciation?', 3.0, 8),
('550e8400-e29b-41d4-a716-446655440809', '550e8400-e29b-41d4-a716-446655440002', 'Utility Token Qualification', 'Transferability', 'Is the token transferable and fungible across wallets and platforms?', 3.0, 9),
('550e8400-e29b-41d4-a716-446655440810', '550e8400-e29b-41d4-a716-446655440002', 'Utility Token Qualification', 'Financial incentives', 'Does the token offer financial or economic incentives in exchange for holding, staking, or participating?', 5.0, 10),

-- Whitepaper & Marketing
('550e8400-e29b-41d4-a716-446655440811', '550e8400-e29b-41d4-a716-446655440002', 'Whitepaper & Marketing', 'EU offering threshold', 'Will the total public offering of the token in the EU be below €1,000,000 within a 12-month period?', 5.0, 11),
('550e8400-e29b-41d4-a716-446655440812', '550e8400-e29b-41d4-a716-446655440002', 'Whitepaper & Marketing', 'Exchange listing plans', 'Have you announced, or do you plan to announce, a listing or application for trading of the token on any exchange within the EU?', 5.0, 12),
('550e8400-e29b-41d4-a716-446655440813', '550e8400-e29b-41d4-a716-446655440002', 'Whitepaper & Marketing', 'Offering scope', 'Are you planning to offer this token to more than 150 persons per EU Member State?', 5.0, 13),
('550e8400-e29b-41d4-a716-446655440814', '550e8400-e29b-41d4-a716-446655440002', 'Whitepaper & Marketing', 'MiCAR whitepaper', 'Will a crypto-asset whitepaper be made available under MiCAR rules?', 3.0, 14),
('550e8400-e29b-41d4-a716-446655440815', '550e8400-e29b-41d4-a716-446655440002', 'Whitepaper & Marketing', 'Marketing compliance', 'Are your marketing materials (website, docs, social media) free from misleading, unclear, or overly promotional language that could imply guaranteed returns?', 5.0, 15),
('550e8400-e29b-41d4-a716-446655440816', '550e8400-e29b-41d4-a716-446655440002', 'Whitepaper & Marketing', 'Website documentation', 'Provide a link to your main website or documentation.', 0.0, 16),

-- Legal Entity
('550e8400-e29b-41d4-a716-446655440817', '550e8400-e29b-41d4-a716-446655440002', 'Legal Entity', 'Registered legal person', 'Is the token issuer a registered legal person (company, foundation, etc.)?', 1000.0, 17),
('550e8400-e29b-41d4-a716-446655440818', '550e8400-e29b-41d4-a716-446655440002', 'Legal Entity', 'Incorporation country', 'In which country is the issuer incorporated?', 0.0, 18),
('550e8400-e29b-41d4-a716-446655440819', '550e8400-e29b-41d4-a716-446655440002', 'Legal Entity', 'EU marketing approach', 'Are you actively marketing or promoting the token to EU-based users, or are you relying on reverse solicitation?', 5.0, 19),

-- Governance / Misc.
('550e8400-e29b-41d4-a716-446655440820', '550e8400-e29b-41d4-a716-446655440002', 'Governance / Misc.', 'Governance rights', 'Does the token offer governance rights (e.g. DAO voting, protocol decisions)? If yes, are these rights only functional and non-financial?', 3.0, 20),
('550e8400-e29b-41d4-a716-446655440821', '550e8400-e29b-41d4-a716-446655440002', 'Governance / Misc.', 'Free token offering', 'Is the token offered for free (e.g. via airdrop or reward) in exchange for user data, promotional activity, or other indirect consideration?', 5.0, 21);