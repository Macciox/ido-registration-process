-- Seed data for development and testing

-- Create admin user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, last_sign_in_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789', NOW(), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create admin profile
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'admin', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create project owner user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, last_sign_in_at)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'project_owner@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789', NOW(), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create project owner profile
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'project_owner@example.com', 'project_owner', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create demo projects
INSERT INTO public.projects (id, name, owner_email, owner_id, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Demo Project 1', 'admin@example.com', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Demo Project 2', 'project_owner@example.com', '00000000-0000-0000-0000-000000000002', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create project fields for Demo Project 1
INSERT INTO public.project_fields (id, project_id, field_name, field_value, status, created_at, updated_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'initialMarketCapExLiquidity', '1000000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'initialMarketCap', '2000000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'fullyDilutedMarketCap', '10000000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'circulatingSupplyAtTge', '10000000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'tgeSupplyPercentage', '10', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'totalSupply', '100000000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'tagline', 'Revolutionary DeFi Platform', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'projectDescription', 'A comprehensive DeFi platform for the next generation of finance.', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'telegram', 'https://t.me/demoproject', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'twitter', 'https://twitter.com/demoproject', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'discord', 'https://discord.gg/demoproject', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'tokenTicker', 'DEMO', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'network', 'Ethereum', 'Confirmed', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create project fields for Demo Project 2
INSERT INTO public.project_fields (id, project_id, field_name, field_value, status, created_at, updated_at)
VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'initialMarketCapExLiquidity', '500000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'initialMarketCap', '1000000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'fullyDilutedMarketCap', '5000000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'circulatingSupplyAtTge', '5000000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'tgeSupplyPercentage', '5', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'totalSupply', '100000000', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'tagline', 'Next-Gen GameFi Platform', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'projectDescription', 'A GameFi platform that revolutionizes the gaming industry.', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'telegram', 'https://t.me/demoproject2', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'twitter', 'https://twitter.com/demoproject2', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'discord', 'https://discord.gg/demoproject2', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'tokenTicker', 'GAME', 'Confirmed', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'network', 'Polygon', 'Confirmed', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create FAQs for Demo Project 1
INSERT INTO public.faqs (id, project_id, question, answer, created_at, updated_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'What is Demo Project 1?', 'Demo Project 1 is a revolutionary DeFi platform that aims to simplify decentralized finance for everyone.', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'When is the token launch?', 'The token launch is scheduled for Q3 2023.', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'What blockchain does it use?', 'Demo Project 1 is built on the Ethereum blockchain.', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'How can I participate in the IDO?', 'You can participate in the IDO by registering on our platform and completing the KYC process.', NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'What is the token utility?', 'The token is used for governance, staking, and accessing premium features on the platform.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create FAQs for Demo Project 2
INSERT INTO public.faqs (id, project_id, question, answer, created_at, updated_at)
VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'What is Demo Project 2?', 'Demo Project 2 is a GameFi platform that combines blockchain technology with gaming.', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'When is the token launch?', 'The token launch is scheduled for Q4 2023.', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'What blockchain does it use?', 'Demo Project 2 is built on the Polygon blockchain.', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'How can I participate in the IDO?', 'You can participate in the IDO by registering on our platform and completing the KYC process.', NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'What is the token utility?', 'The token is used for in-game purchases, staking, and accessing exclusive game content.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Quiz Questions for Demo Project 1
INSERT INTO public.quiz_questions (id, project_id, question, options, correct_option, created_at, updated_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'What blockchain is Demo Project 1 built on?', '["Ethereum", "Binance Smart Chain", "Solana", "Polygon"]', 0, NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'What is the total supply of DEMO tokens?', '["50 million", "100 million", "500 million", "1 billion"]', 1, NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'What percentage of tokens will be released at TGE?', '["5%", "10%", "15%", "20%"]', 1, NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'What is the main focus of Demo Project 1?', '["Gaming", "DeFi", "Social Media", "Supply Chain"]', 1, NOW(), NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'When was Demo Project 1 founded?', '["2020", "2021", "2022", "2023"]', 2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create Quiz Questions for Demo Project 2
INSERT INTO public.quiz_questions (id, project_id, question, options, correct_option, created_at, updated_at)
VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'What blockchain is Demo Project 2 built on?', '["Ethereum", "Binance Smart Chain", "Solana", "Polygon"]', 3, NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'What is the total supply of GAME tokens?', '["50 million", "100 million", "500 million", "1 billion"]', 1, NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'What percentage of tokens will be released at TGE?', '["5%", "10%", "15%", "20%"]', 0, NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'What is the main focus of Demo Project 2?', '["Gaming", "DeFi", "Social Media", "Supply Chain"]', 0, NOW(), NOW()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'When was Demo Project 2 founded?', '["2020", "2021", "2022", "2023"]', 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create project owners for Demo Project 1
INSERT INTO public.project_owners (id, project_id, email, owner_id, status, created_at, updated_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'project_owner@example.com', '00000000-0000-0000-0000-000000000002', 'verified', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create admin invitation (for testing)
INSERT INTO public.admin_invitations (id, email, token, status, assigned_role, expires_at, created_at)
VALUES
  (gen_random_uuid(), 'new_admin@example.com', 'test-token-12345', 'pending', 'admin', NOW() + INTERVAL '7 days', NOW())
ON CONFLICT (id) DO NOTHING;