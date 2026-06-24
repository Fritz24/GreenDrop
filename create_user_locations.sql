-- SQL to run in Supabase SQL Editor
-- This table stores multiple saved locations per user (Home, Office, School, Business, etc.)

CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Home', -- Name of location e.g., 'Home', 'Office', 'School'
  city TEXT NOT NULL,                -- Name of city e.g., 'Yaoundé', 'Douala', 'Bafoussam', 'Bamenda'
  address TEXT NOT NULL,             -- Formatted street address
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Users can view their own locations
DROP POLICY IF EXISTS "Users can view their own locations" ON user_locations;
CREATE POLICY "Users can view their own locations"
  ON user_locations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Policy: Users can insert their own locations
DROP POLICY IF EXISTS "Users can insert their own locations" ON user_locations;
CREATE POLICY "Users can insert their own locations"
  ON user_locations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. Policy: Users can update their own locations
DROP POLICY IF EXISTS "Users can update their own locations" ON user_locations;
CREATE POLICY "Users can update their own locations"
  ON user_locations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Policy: Users can delete their own locations
DROP POLICY IF EXISTS "Users can delete their own locations" ON user_locations;
CREATE POLICY "Users can delete their own locations"
  ON user_locations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RPC function to allow users to delete their own accounts
-- This must run with SECURITY DEFINER privileges to bypass standard auth schema deletion blocks.
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete child references first to bypass foreign key constraint blocks
  DELETE FROM public.user_locations WHERE user_id = current_user_id;
  DELETE FROM public.pickup_items WHERE pickup_id IN (SELECT id FROM public.pickups WHERE user_id = current_user_id);
  DELETE FROM public.pickups WHERE user_id = current_user_id;
  DELETE FROM public.profiles WHERE id = current_user_id;

  -- Delete from auth.users (cascades where configured)
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
