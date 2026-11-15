-- ============================================================================
-- INCIDENTZERO LITE: 04_auth.sql
-- Migration: Add pgcrypto extension, password_hash column, demo hashes and FK indexes
-- Idempotent: safe to run multiple times
-- ============================================================================

-- 1. Enable pgcrypto extension for cryptographic functions (gen_salt, crypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add password_hash column to users table (nullable to allow users created without passwords)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Demo credential, stored only as a bcrypt hash (password: Demo@123)
-- Only sets password_hash if it is currently NULL, preserving existing hashes on re-run
UPDATE users
SET password_hash = crypt('Demo@123', gen_salt('bf'))
WHERE email = 'aditya.raj@incidentzero.internal' AND password_hash IS NULL;

UPDATE users
SET password_hash = crypt('Demo@123', gen_salt('bf'))
WHERE email = 'alakh.gupta@incidentzero.internal' AND password_hash IS NULL;

UPDATE users
SET password_hash = crypt('Demo@123', gen_salt('bf'))
WHERE email = 'priya.sharma@incidentzero.internal' AND password_hash IS NULL;

UPDATE users
SET password_hash = crypt('Demo@123', gen_salt('bf'))
WHERE email = 'auditor@incidentzero.internal' AND password_hash IS NULL;

-- 4. Foreign-key indexes for incidents table
CREATE INDEX IF NOT EXISTS idx_incidents_service_id ON incidents(service_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);
