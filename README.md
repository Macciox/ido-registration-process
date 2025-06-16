# IDO Registration Process

A secure platform for managing Web3 project launches and IDO registrations.

## Features

- **User Roles**: Admin and Project Owner roles with appropriate permissions
- **Project Management**: Create and manage IDO projects
- **Form Management**: Track project details with status indicators
- **Authentication**: Secure login and registration system
- **Admin Invitations**: Secure system for adding new administrators

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ido-registration-process.git
cd ido-registration-process
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
Create a `.env.local` file in the root directory with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup

1. Run the schema migrations in the `supabase/migrations` directory
2. Set up initial admin user through the Supabase dashboard

## Project Structure

- `/src/components`: React components
- `/src/pages`: Next.js pages
- `/src/lib`: Utility functions and API clients
- `/src/types`: TypeScript type definitions
- `/supabase`: Supabase schema and migrations

## License

This project is licensed under the MIT License - see the LICENSE file for details.