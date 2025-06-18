# Changelog

## [Unreleased]

### Added
- Row-Level Security (RLS) functions for improved security
  - `is_admin()` function to check if current user is an admin
  - `is_project_owner(project_id)` function to check if current user is a project owner
- RLS policies for all tables using these functions
- Support for localStorage fallback when database tables don't exist
- Improved navigation with buttons instead of links
- Back to Dashboard buttons on all project pages

### Changed
- Replaced `owner_email` with `owner_id` in projects table for better data integrity
- Added `owner_id` to project_owners table
- Updated RLS functions to use `owner_id` instead of email
- Added indexes on `created_at`, `project_id`, and `email` fields for better performance
- Improved error handling for missing tables
- Enhanced project owners management with better status tracking

### Fixed
- Navigation issues when clicking on dashboard link
- Project owners management when table doesn't exist
- Admin invitations when table doesn't exist
- Type errors in various components

## [0.1.0] - 2023-06-01

### Added
- Initial release with basic functionality
- Project creation and management
- Admin dashboard
- User authentication