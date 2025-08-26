-- Seed checker templates and items

-- Insert templates with fixed UUIDs
INSERT INTO checker_templates (id, name, type, description, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Whitepaper MiCA v1', 'whitepaper', 'MiCA compliance checklist for crypto asset whitepapers', true),
('550e8400-e29b-41d4-a716-446655440002', 'Legal Opinion EU v1', 'legal', 'EU legal opinion compliance checker for MiCA regulation', true);

-- Official MiCA Whitepaper checklist items
INSERT INTO checker_items (id, template_id, category, item_name, description, weight, sort_order) VALUES
-- Part A: Information about the offeror
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A1 - Name', 'Name of the offeror or person seeking admission to trading', 2.0, 1),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A2 - Legal form', 'Legal form of the offeror', 2.0, 2),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A3 - Registered address', 'Registered address and head office, where different', 2.0, 3),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A4 - Registration date', 'Date of the registration', 1.5, 4),
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A5 - Legal entity identifier', 'Legal entity identifier or another identifier required pursuant to applicable national law', 2.0, 5),
('550e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A6 - Contact information', 'Contact telephone number and email address with response time commitment', 2.0, 6),
('550e8400-e29b-41d4-a716-446655440107', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A7 - Parent company', 'Where applicable, the name of the parent company', 1.0, 7),
('550e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A8 - Management body', 'Identity, business addresses and functions of management body members', 2.5, 8),
('550e8400-e29b-41d4-a716-446655440109', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A9 - Business activity', 'Business or professional activity of the offeror and parent company', 2.0, 9),
('550e8400-e29b-41d4-a716-446655440110', '550e8400-e29b-41d4-a716-446655440001', 'Part A - Offeror', 'A10 - Financial condition', 'Financial condition over the past three years with fair review of development and performance', 3.0, 10),

-- Part D: Information about the crypto-asset project
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440001', 'Part D - Project', 'D1 - Project name', 'Name of the crypto-asset project and crypto-assets, abbreviation or ticker', 2.5, 11),
('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440001', 'Part D - Project', 'D2 - Project description', 'Brief description of the crypto-asset project', 3.0, 12),
('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440001', 'Part D - Project', 'D3 - Involved persons', 'Details of all persons involved in implementation (advisors, development team, service providers)', 2.5, 13),
('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440001', 'Part D - Project', 'D4 - Utility features', 'Key features of goods or services to be developed (for utility tokens)', 2.0, 14),
('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440001', 'Part D - Project', 'D5 - Milestones', 'Past and future milestones of the project and allocated resources', 2.5, 15),
('550e8400-e29b-41d4-a716-446655440206', '550e8400-e29b-41d4-a716-446655440001', 'Part D - Project', 'D6 - Use of funds', 'Planned use of any funds or other crypto-assets collected', 3.0, 16),

-- Part E: Information about the offer
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E1 - Offer indication', 'Indication whether concerning offer to public or admission to trading', 2.0, 17),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E2 - Offer reasons', 'Reasons for the offer to the public or seeking admission to trading', 2.0, 18),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E3 - Fundraising amount', 'Amount to raise, minimum/maximum targets, oversubscription handling', 3.0, 19),
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E4 - Issue price', 'Issue price and subscription fees or price determination method', 2.5, 20),
('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E5 - Total number', 'Total number of crypto-assets to be offered or admitted to trading', 2.0, 21),
('550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E6 - Target holders', 'Prospective holders targeted and any restrictions', 1.5, 22),
('550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E7 - Reimbursement notice', 'Notice about reimbursement conditions and refund mechanism', 3.0, 23),
('550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E8 - Offer phases', 'Various phases including pre-public sales and discounted prices', 2.0, 24),
('550e8400-e29b-41d4-a716-446655440309', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E9 - Subscription period', 'Subscription period for time-limited offers', 2.0, 25),
('550e8400-e29b-41d4-a716-446655440310', '550e8400-e29b-41d4-a716-446655440001', 'Part E - Offer', 'E10 - Safeguard arrangements', 'Arrangements to safeguard funds during offer and withdrawal period', 3.0, 26),

-- Part F: Information about the crypto-assets
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440001', 'Part F - Assets', 'F1 - Asset type', 'Type of crypto-asset offered or seeking admission to trading', 3.0, 27),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440001', 'Part F - Assets', 'F2 - Characteristics', 'Description of characteristics and functionality of crypto-assets', 3.0, 28),

-- Part G: Rights and obligations
('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440001', 'Part G - Rights', 'G1 - Rights description', 'Description of rights and obligations of purchaser and exercise procedures', 3.0, 29),
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440001', 'Part G - Rights', 'G2 - Modification conditions', 'Conditions under which rights and obligations may be modified', 2.0, 30),
('550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440001', 'Part G - Rights', 'G3 - Future offers', 'Information on future offers and tokens retained by issuer', 2.0, 31),
('550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440001', 'Part G - Rights', 'G4 - Utility access', 'Quality and quantity of goods/services for utility tokens', 2.5, 32),
('550e8400-e29b-41d4-a716-446655440505', '550e8400-e29b-41d4-a716-446655440001', 'Part G - Rights', 'G5 - Redemption', 'How utility tokens can be redeemed for goods or services', 2.5, 33),

-- Part H: Technology information
('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440001', 'Part H - Technology', 'H1 - Technology used', 'Information on distributed ledger technology, protocols and standards', 3.0, 34),
('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440001', 'Part H - Technology', 'H2 - Consensus mechanism', 'The consensus mechanism, where applicable', 2.5, 35),
('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440001', 'Part H - Technology', 'H3 - Incentive mechanisms', 'Incentive mechanisms to secure transactions and applicable fees', 2.0, 36),
('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440001', 'Part H - Technology', 'H4 - DLT functioning', 'Detailed description of distributed ledger technology functioning', 2.5, 37),
('550e8400-e29b-41d4-a716-446655440605', '550e8400-e29b-41d4-a716-446655440001', 'Part H - Technology', 'H5 - Audit outcome', 'Information on technology audit outcome, if conducted', 2.0, 38),

-- Part I: Risk information
('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440001', 'Part I - Risks', 'I1 - Offer risks', 'Risks associated with the offer to public or admission to trading', 3.0, 39),
('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440001', 'Part I - Risks', 'I2 - Issuer risks', 'Risks associated with the issuer or person seeking admission', 2.5, 40),
('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440001', 'Part I - Risks', 'I3 - Asset risks', 'Risks associated with the crypto-assets', 3.0, 41),
('550e8400-e29b-41d4-a716-446655440704', '550e8400-e29b-41d4-a716-446655440001', 'Part I - Risks', 'I4 - Implementation risks', 'Risks associated with project implementation', 2.5, 42),
('550e8400-e29b-41d4-a716-446655440705', '550e8400-e29b-41d4-a716-446655440001', 'Part I - Risks', 'I5 - Technology risks', 'Risks associated with technology used and mitigation measures', 3.0, 43);

-- Legal Opinion EU checklist items
INSERT INTO checker_items (id, template_id, category, item_name, description, weight, sort_order) VALUES
-- Legal Analysis Category
('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440002', 'Legal Analysis', 'MiCA Compliance Assessment', 'Assessment of token compliance with MiCA regulation', 3.0, 1),
('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440002', 'Legal Analysis', 'Token Classification under MiCA', 'Legal classification as ART, EMT, or other crypto-asset', 3.0, 2),
('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440002', 'Legal Analysis', 'Regulatory Requirements', 'Specific regulatory requirements and obligations', 2.5, 3),
('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440002', 'Legal Analysis', 'Cross-Border Implications', 'Multi-jurisdictional legal considerations', 2.0, 4),

-- Compliance Category
('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440002', 'Compliance', 'Licensing Requirements', 'Required licenses and authorizations under MiCA', 3.0, 5),
('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440002', 'Compliance', 'Operational Requirements', 'Operational compliance requirements and procedures', 2.5, 6),
('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440002', 'Compliance', 'Consumer Protection', 'Consumer protection measures and disclosures', 2.0, 7),
('550e8400-e29b-41d4-a716-446655440704', '550e8400-e29b-41d4-a716-446655440002', 'Compliance', 'Market Integrity', 'Market abuse prevention and integrity measures', 2.0, 8),

-- Risk Assessment Category
('550e8400-e29b-41d4-a716-446655440801', '550e8400-e29b-41d4-a716-446655440002', 'Risk Assessment', 'Legal Risk Analysis', 'Comprehensive legal risk assessment', 2.5, 9),
('550e8400-e29b-41d4-a716-446655440802', '550e8400-e29b-41d4-a716-446655440002', 'Risk Assessment', 'Regulatory Risk Factors', 'Regulatory uncertainty and compliance risks', 2.0, 10),
('550e8400-e29b-41d4-a716-446655440803', '550e8400-e29b-41d4-a716-446655440002', 'Risk Assessment', 'Enforcement Risk', 'Risk of regulatory enforcement actions', 1.5, 11);