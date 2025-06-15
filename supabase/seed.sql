-- Seed data for testing
-- This will create an admin user after you've created a user through the auth system

-- Replace 'admin@example.com' with your actual admin email, more than one admin can be created?
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'piero@decubate.com';

-- You can add more seed data here if needed