# CHANGELOG — RECOVRA

All notable changes to the RECOVRA platform will be documented in this file.

## [v1.0.0-buildathon] - 2026-09-05

### Added
- **Server-Side Supabase JWT Auth**: Added server-side Supabase JWT cryptographic validation in `src/lib/security.ts` with `requireAuthenticatedUser`, `requireMerchantAccess`, `requireAdminAccess`.
- **Forward-Only Database Migration**: Created `supabase/migrations/002_security_rls_queue.sql` containing `recovery_queue`, `merchant_settings`, `payment_links`, and strict `auth.uid() = merchant_id` RLS policies.
- **Durable PostgreSQL Recovery Queue**: Replaced in-memory queue arrays with PostgreSQL `recovery_queue` table persistence and atomic worker leases (`status = 'RUNNING'`, `leased_until`).
- **Timing-Safe HMAC Signatures**: Implemented `crypto.timingSafeEqual` in `razorpayAdapter` for Razorpay webhook verification.
- **Atomic Webhook Replay Protection**: Created `webhook_events` database table with `UNIQUE` constraint on `event_id` to prevent duplicate event delivery.
- **Razorpay Payment Links in Test Mode**: Connected real Razorpay Payment Links API with fallback simulation disclosures.
- **Dual-Engine AI Negotiator**: Enhanced Gemini REST API model cascade (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash-exp`) with MIME fallback, regex JSON parsing (`/\{[\s\S]*\}/`), and dynamic contextual AI responses.
- **Export & Settings APIs**: Created CSV/JSON export endpoints at `/api/export/audit` and `/api/export/recovery`, and persistent settings endpoint at `/api/settings`.
- **1-Click Demo Login & Seeder**: Added 1-Click Demo Operator Login on Sign In & Sign Up pages and 1-Click 100 Demo Record Seeder on Dashboard.
- **Vercel & Deployment Readiness**: Added `vercel.json`, `.gitignore`, `.env.example`, and package verification scripts (`test`, `test:unit`, `test:rls`, `typecheck`).
