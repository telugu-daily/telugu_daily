-- ============================================
-- Migration: add last_active + learned_days
-- Run once in Supabase SQL Editor.
-- ============================================

-- 1. Add columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_active   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS learned_days  JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active
  ON user_profiles (last_active);

-- ============================================
-- pg_cron: auto-delete inactive users (>30 days)
-- Requires the pg_cron extension to be enabled
--   Dashboard ▸ Database ▸ Extensions ▸ pg_cron ▸ Enable
-- ============================================

-- Reusable cleanup function (transactional, safe to re-run)
CREATE OR REPLACE FUNCTION public.delete_inactive_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - INTERVAL '30 days';
BEGIN
  -- 1. Day progress rows for inactive users
  DELETE FROM public.user_day_progress
  WHERE user_id IN (
    SELECT id FROM public.user_profiles WHERE last_active < cutoff
  );

  -- 2. Profile rows
  DELETE FROM public.user_profiles
  WHERE last_active < cutoff;

  -- 3. Auth users (cascades will mop up anything still linked)
  DELETE FROM auth.users
  WHERE last_sign_in_at < cutoff;
END;
$$;

-- Schedule: every day at 00:00 UTC
SELECT cron.schedule(
  'delete-inactive-users',
  '0 0 * * *',
  $$ SELECT public.delete_inactive_users(); $$
);

-- To remove the job later:
--   SELECT cron.unschedule('delete-inactive-users');

-- To inspect users that WOULD be deleted at next run:
--   SELECT id, email, last_active
--   FROM user_profiles
--   WHERE last_active < NOW() - INTERVAL '30 days';
