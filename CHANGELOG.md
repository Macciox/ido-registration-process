# Changelog

All notable changes to the IDO Registration Process project will be documented in this file.

## [Unreleased]

## [0.1.0] - 2024-05-02

### Added
- Initial database schema with profiles, projects, project_fields, FAQs, and quiz_questions tables
- Row-level security policies for all tables
- Authentication system with admin and project owner roles
- Project owner registration with email whitelist verification
- Admin invitation system with secure unique links
- Project dashboard for project owners
- Admin dashboard with project management
- Form tabs with completion tracking:
  - Token Info form
  - Platform Setup form
  - IDO Metrics form (Public Round)
  - Marketing Kit form
  - FAQ management
  - Learn-to-Earn Quiz management
- Field status tracking (Confirmed, Not Confirmed, Might Still Change)
- Default "Not Confirmed" status for all form fields
- Password reset functionality
- Logout functionality
- Mobile-responsive navigation

### Changed
- Simplified login interface focusing on project owners
- Improved navigation with clear role indicators
- Enhanced form UI with status indicators and completion tracking

### Security
- Implemented row-level security for all database tables
- Created secure admin invitation system
- Added email verification for project owner registration
- Restricted access to forms based on user roles
- Added expiration to admin invitation links (7 days)

## Database Schema

### Tables
- `profiles`: Stores user roles (admin, project_owner)
- `projects`: Stores project information
- `project_fields`: Stores all form fields with status tracking
- `faqs`: Stores project FAQs
- `quiz_questions`: Stores L2E quiz questions
- `admin_invitations`: Tracks admin invitation links

### Security
- Row-level security policies for all tables
- Automatic role assignment on user creation
- Role-based access control for all operations