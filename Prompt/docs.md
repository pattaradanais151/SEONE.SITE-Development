SE-ONE.SITE Project Documentation

1. Project Overview

Project Name: SE-ONE.SITE Project Development

Project Folder: se-one-dev

Developer: Cr.Pattaradanai Saiwongkham

Organization / Brand: InfiniteStack Corp.

Program: Student Software Engineering, RMUTL

Generation: 69 — Generation 4

SEC: SEC 2

Position: Full-Stack Developer

Objective:
To build a comprehensive platform for the Software Engineering RMUTL 69 Gen 4 cohort. The platform integrates a member showcase, academic task management, secure file sharing, and a coding practice sandbox. It must be production-ready, secure, maintainable, highly performant, and scalable.

2. Architecture & Technology Stack

Frontend

Framework: React (JSX format for components)

Build Tool: Vite

Styling: Tailwind CSS v4, Emotion (managed via Design Tokens)

Routing: React Router (or equivalent modern routing)

Design System: Custom Apple.com-inspired design (Minimalism, strong typography, accessible contrast)

Optimization: Priority Hints, PWA, Route-aware Custom Metadata

Backend (Supabase-first)

Auth: Supabase Auth (Email/Password, Role-based)

Database: Supabase PostgreSQL with rigorous Row Level Security (RLS)

Storage: Supabase Storage (Public/Private with access control)

Edge Functions: Supabase Edge Functions (when appropriate)

Infrastructure & Services

Hosting: Cloudflare Pages (Frontend & Server-side API via Functions/Workers)

Domain: Custom Domain with HTTPS enforced

Analytics: Google Analytics & Google Tag Manager (Privacy compliant)

Notifications: Discord Webhooks (Handled securely via server-side service, never client-side)

3. Complete Route List

Public Website

/ — Landing Page

/talents — Talents (GitHub Profiles of members)

/about — About the project and developer

/support — Redirects to Discord Support

SEWORK

/sework/landing — Public summary of academic progress

/sework/login — Authentication

/sework/forgot-password — Password recovery

/sework/se-console/dashboard — Canonical Dashboard

/sework/se-console/announcements

/sework/se-console/assignments

/sework/se-console/schedules

/sework/se-console/subjects

/sework/se-console/sheet-data

/sework/se-console/resource-center

/sework/se-console/submission-links

/sework/se-console/submission-tracking

/sework/se-console/leaderboard

/sework/se-console/users (Manager/CEO only)

/sework/se-console/contacts

/sework/se-console/semesters

/sework/se-console/internal-links

/sework/se-console/export

/sework/se-console/profile

(Legacy Redirect: /sework/console/dashboard → /sework/se-console/dashboard)

CLOUDFILES

/cloudfiles/login

/cloudfiles/landing

/cloudfiles/landing/folder/add

/cloudfiles/landing/folder/:folderId

CODING

/coding/landing

/coding/login

/coding/workspace/:username

Legal

/privacy-policy

/license-agreements

/pdpa

/terms-of-use

4. Full Requirements

4.1 Academic Data Model

Supports Academic Year, Year Level (1-4), Semester (1-3), SEC (1 and 2), Subjects, Assignments, Announcements, Schedules, Submissions, and Users. Data must be dynamically fetched from the database, never hardcoded.

4.2 Authentication & Roles

Roles: CEO (highest), Manager, Admin.

Rules: Strict server-side authorization. Frontend role checks are for UI/UX only. RLS must protect all data mutations.

4.3 UI/UX & Security Rules

No MockData in production.

Copy/Selection: Text selection and context menus disabled in specific areas (F12 and Ctrl+Shift+I must remain active).

Secrets: No API keys, Webhooks, or Passwords in client-side code.

4.4 Discord Notifications

Server-side only. Must handle retries, separate DB success from delivery status, and prevent sensitive data leakage.

4.5 SEO & Core Web Vitals (Mandatory)

Targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.

SEO Scope: Public routes (/, /talents, /about, /sework/landing, Legal pages) must be indexable with unique metadata. Private routes must be securely blocked.

Bundle Optimization: Route-based code splitting, lazy loading, and tree shaking.

Assets: WebP/AVIF images, priority hints for LCP, restricted animation impact on main thread.

5. Target Folder Structure

se-one-dev/
├── docs.md
├── package.json
├── eslint.config.js
├── index.html
├── public/
└── src/
    ├── Pages/        # Page-level React Components
    ├── lib/          # Supabase Client & Integrations
    ├── components/   # Reusable UI Components
    └── utils/        # Validation, Formatting & Utilities


(Structure will be verified and expanded iteratively as needed)

6. Phase Roadmap

Phase 0 — Documentation and Requirements (Current)

Phase 1 — Project Foundation: Vite, Tailwind v4, Emotion, Routing, ESLint, Layouts.

Phase 2 — Supabase and Security Foundation: DB Schema, RLS, Auth, Roles, Notifications.

Phase 3 — Main Website: Landing, Talents, About, Support.

Phase 4 — SEWORK Authentication and Public Pages.

Phase 5 — SEWORK Academic Core: Semesters, Subjects, Announcements, Assignments, Schedules.

Phase 6 — SEWORK Administration: Dashboard, Tracking, Leaderboard, Users, Export, Profile.

Phase 7 — CLOUDFILES: Secure directory, Folder passwords, Upload/Download, Access Control.

Phase 8 — CODING: Sandbox environment, Browser Preview, Secure Execution.

Phase 9 — Legal, PWA, Analytics and Performance: Policies, PWA Manifest, SEO, GTM.

Phase 10 — Integration and Quality Assurance: E2E testing, RLS audits, Accessibility.

Phase 11 — Deployment: Cloudflare Pages, Custom Domain, Production Smoke Tests.

Phase 12 — Release and Maintenance: Monitoring, Backups, Updates.

7. Current Progress

[x] Phase 0: Documentation and Requirements created.

[ ] Phase 1: Project Foundation (Pending User Approval to inspect existing project).

[ ] Phase 2: Supabase and Security Foundation

[ ] ...

8. Security Requirements

All protected routes and data must use Supabase Auth and RLS.

Passwords must never be stored as plaintext or accessed via frontend.

No Role Escalation (Managers cannot grant CEO).

Validate all file uploads and External URLs.

Sensitive environment variables remain on the server (Cloudflare Functions/Supabase Edge).

9. Acceptance Criteria

Documentation: docs.md updated after every milestone.

Performance: Meets Core Web Vitals targets; no lazy-loaded LCP; bundle size optimized.

Supabase: RLS passes audit; no MockData; backend errors handled gracefully.

SEWORK: Leaderboard points calculate correctly; Academic filters work per SEC.

CLOUDFILES: Password-protected folders verified via Backend; read-only visitors cannot edit.

CODING: Sandbox isolates code execution safely without exposing environment secrets.

10. Open Decisions

Determine execution strategy for JSX/TSX in Phase 8 (Coding).

Evaluate specific password-hashing strategy for Cloudfiles Folder Passwords (e.g., bcrypt in Edge Function).

Confirm base Vite configuration from the user's existing folder.

11. Change Log

[Current Date]: Initial creation of docs.md outlining full project scope, architecture, and constraints.