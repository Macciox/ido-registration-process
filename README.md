# Decubate IDO Registration Platform

A modern web application for managing IDO project onboarding and preparation, replacing the manual Google Docs workflow.

## Overview

This platform allows:
- **Decubate (Admin users)** to create dedicated onboarding pages for each project launching with them
- **Project teams (Project Owners)** to log in securely and update their project details for upcoming IDOs

## Tech Stack

- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Backend**: Supabase (Authentication and Database)

## Project Structure

The application is organized into the following main sections:

- **Public Round (IDO) | Metrics**: Launch dates, token details, allocation information
- **Token Info**: Market cap, supply details
- **Platform Setup**: Project description, social media links
- **FAQ**: Customizable FAQ entries
- **L2E Quiz**: Learn-to-earn quiz questions
- **Marketing Kit**: Upload or link to marketing materials

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Run the development server:
   ```
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema in `supabase/schema.sql` to set up the database tables and policies
3. Configure authentication:
   - Enable Email/Password sign-in
   - Set up email templates for verification
4. Create an admin user:
   - Sign up a user through the Supabase authentication
   - In the Supabase SQL editor, run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
   ```

## User Roles

### Admin
- Can create new projects
- Can assign project owners by email
- Has access to all projects
- Can edit all project fields

### Project Owner
- Can only access their assigned project
- Can update all fields for their project
- Can set status for each field: Confirmed, Not Confirmed, Might Still Change

## Deployment

This project is configured for deployment on Vercel. Connect your GitHub repository to Vercel for automatic deployments.