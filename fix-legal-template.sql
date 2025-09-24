-- Fix Legal Template: Add 21 legal items to Legal Opinion MiCA v1 template
-- Template ID: 550e8400-e29b-41d4-a716-446655440002

INSERT INTO checker_items (template_id, category, item_name, description, weight, sort_order, field_type, scoring_logic) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Rights similar to shares/bonds', 'Does the token provide rights similar to shares or bonds?', 1.0, 1, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Profit sharing rights', 'Does the token provide profit sharing or dividend rights?', 1.0, 2, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Voting rights', 'Does the token provide voting rights in the issuer?', 1.0, 3, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Repayment obligation', 'Does the token create a repayment obligation for the issuer?', 1.0, 4, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Token Classification', 'Interest payments', 'Does the token provide for interest or similar payments?', 1.0, 5, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Stablecoin Requirements', 'Single currency peg', 'Is the token pegged to a single fiat currency?', 1.0, 6, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Stablecoin Requirements', 'Basket of currencies', 'Is the token pegged to a basket of fiat currencies?', 1.0, 7, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Stablecoin Requirements', 'Commodity reference', 'Is the token referenced to commodities or other assets?', 1.0, 8, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Stablecoin Requirements', 'Algorithmic stabilization', 'Does the token use algorithmic mechanisms for price stability?', 1.0, 9, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Issuer Requirements', 'Registered legal entity', 'Is the issuer a registered legal entity in the EU?', 1.0, 10, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Issuer Requirements', 'MiCA authorization', 'Does the issuer have or require MiCA authorization?', 1.0, 11, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Issuer Requirements', 'Minimum capital', 'Does the issuer meet minimum capital requirements?', 1.0, 12, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Compliance Obligations', 'Whitepaper publication', 'Is there an obligation to publish a crypto-asset whitepaper?', 1.0, 13, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Compliance Obligations', 'Notification requirements', 'Are there notification requirements to competent authorities?', 1.0, 14, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Compliance Obligations', 'Marketing restrictions', 'Are there marketing and advertising restrictions?', 1.0, 15, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Risk Assessment', 'Market manipulation risk', 'Is there risk of market manipulation?', 1.0, 16, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Risk Assessment', 'Money laundering risk', 'Is there anti-money laundering compliance risk?', 1.0, 17, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Risk Assessment', 'Consumer protection risk', 'Are there consumer protection concerns?', 1.0, 18, 'Yes/No', 'Yes = 1000, No = 0'),
('550e8400-e29b-41d4-a716-446655440002', 'Exemptions', 'Small offering exemption', 'Does the offering qualify for small offering exemptions?', 1.0, 19, 'Yes/No', 'Yes = 0, No = 1000'),
('550e8400-e29b-41d4-a716-446655440002', 'Exemptions', 'Utility token exemption', 'Does the token qualify as a utility token exemption?', 1.0, 20, 'Yes/No', 'Yes = 0, No = 1000'),
('550e8400-e29b-41d4-a716-446655440002', 'Exemptions', 'DeFi protocol exemption', 'Does the token qualify for DeFi protocol exemptions?', 1.0, 21, 'Yes/No', 'Yes = 0, No = 1000');