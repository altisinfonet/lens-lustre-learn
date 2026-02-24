

# User Roles & Permissions System

## Role Architecture

### Roles (stored in a separate `user_roles` table for security)
- **user** – Default role for all signups
- **judge** – Can review and score competition submissions
- **content_editor** – Can create/edit journal articles and courses
- **admin** – Full platform management access

### How Roles Work
- Everyone signs up with a single **user** role
- Features unlock automatically based on actions (submit a photo → photographer capabilities, enroll in course → learner capabilities)
- **Judge** and **Content Editor** roles are assigned via admin OR through an application/approval flow
- Users can hold multiple roles simultaneously (e.g., user + judge)

## Capabilities by Role

### User (default)
- Create and edit profile with portfolio link, avatar, bio
- Upload photography submissions to competitions
- Enroll in courses and track progress
- Comment on journal articles
- Bookmark articles and courses
- Download certificates (course completion + competition wins)

### Judge (applied for or admin-assigned)
- All user capabilities
- Access judging panel for assigned competitions
- Score and provide feedback on submissions

### Content Editor (applied for or admin-assigned)
- All user capabilities
- Create, edit, and publish journal articles
- Create and manage courses & lessons

### Admin
- Full access to everything
- Manage all competitions, courses, articles
- Approve/reject role applications (judge, content editor)
- Manage users and assign roles directly
- View platform analytics

## Role Application Flow
- Users can apply for Judge or Content Editor roles from their dashboard
- Application includes a short form (reason/portfolio/experience)
- Admins see pending applications in the admin dashboard
- Admins approve or reject with optional message
- User gets notified of the decision

## Certificates
- **Course completion certificates** – Auto-generated when all lessons in a course are marked complete
- **Competition winner certificates** – Generated for 1st, 2nd, 3rd place winners
- Downloadable as styled PDF from the user dashboard
- Stored in Supabase Storage

## Database Design (Supabase)
- `user_roles` table with `user_id` + `role` (enum: user, judge, content_editor, admin)
- `role_applications` table for tracking judge/content editor applications
- `certificates` table linking users to earned certificates
- Security definer function `has_role()` for RLS policies (no recursive policies)
- All tables protected with Row Level Security

## Security
- Role checks always done server-side via `has_role()` function
- No client-side role storage or hardcoded credentials
- RLS policies on all tables ensuring users only access what their role permits
- Admin actions protected by admin role check

