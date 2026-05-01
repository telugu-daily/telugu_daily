-- ============================================
-- Fix RLS Policies for User Profiles
-- ============================================

-- First drop the old restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create a single, full-access policy for the user's own data
CREATE POLICY "Users can manage own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Fix RLS Policies for User Day Progress
-- ============================================

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "Users can view own progress" ON user_day_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_day_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_day_progress;

-- Create a single, full-access policy for the user's own data
CREATE POLICY "Users can manage own progress"
  ON user_day_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
