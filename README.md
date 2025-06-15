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
- **Future Backend**: Supabase (to be implemented)
- **Future Auth**: Supabase Email-based auth

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
3. Run the development server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

This project is configured for deployment on Vercel. Connect your GitHub repository to Vercel for automatic deployments.

## Future Implementations

- Supabase integration for authentication and database
- Role-based access control (Admin vs Project Owner)
- Field-by-field permissions and status tracking
- File upload functionality for marketing materials