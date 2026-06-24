-- Run this script in the Supabase SQL Editor to fix the RLS policies for pickups.
-- This will allow Admin and Super Admin accounts to view and update all pickups.

-- 1. Ensure Row Level Security is enabled
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing SELECT policies on pickups to avoid duplicates
DROP POLICY IF EXISTS "Users can view their own pickups" ON public.pickups;
DROP POLICY IF EXISTS "Admins can view all pickups" ON public.pickups;
DROP POLICY IF EXISTS "Agents can view pickups" ON public.pickups;

-- 3. Create SELECT policies on pickups
-- Policy A: Users can view their own requested pickups
CREATE POLICY "Users can view their own pickups" ON public.pickups
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy B: Admins and Super Admins can view ALL pickups
CREATE POLICY "Admins can view all pickups" ON public.pickups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy C: Agents can view pickups assigned to them OR pending pickups (unassigned)
CREATE POLICY "Agents can view pickups" ON public.pickups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND (
          public.profiles.role = 'agent' 
          AND (agent_id = auth.uid() OR agent_id IS NULL OR status = 'pending')
        )
    )
  );

-- 4. Create UPDATE policy on pickups (so admins can assign agents, agents can change status)
DROP POLICY IF EXISTS "Admins and agents can update pickups" ON public.pickups;
CREATE POLICY "Admins and agents can update pickups" ON public.pickups
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role IN ('admin', 'super_admin', 'agent')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role IN ('admin', 'super_admin', 'agent')
    )
  );

-- 5. Drop existing SELECT policies on pickup_items to avoid duplicates
DROP POLICY IF EXISTS "Users can view their own pickup items" ON public.pickup_items;
DROP POLICY IF EXISTS "Admins can view all pickup items" ON public.pickup_items;

-- 6. Create SELECT policies on pickup_items
-- Policy A: Users can view items for their own pickups
CREATE POLICY "Users can view their own pickup items" ON public.pickup_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pickups
      WHERE public.pickups.id = pickup_id
        AND public.pickups.user_id = auth.uid()
    )
  );

-- Policy B: Admins, Super Admins, and Agents can view ALL pickup items
CREATE POLICY "Admins can view all pickup items" ON public.pickup_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role IN ('admin', 'super_admin', 'agent')
    )
  );
