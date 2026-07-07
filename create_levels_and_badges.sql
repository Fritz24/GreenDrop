-- SQL to run in Supabase SQL Editor
-- Sets up the levels and badges tables, enables Row Level Security (RLS), and seeds initial data.

-- =========================================================================
-- 1. Create Levels Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER NOT NULL,
  next_level_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 2. Create Badges Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,          -- String corresponding to Lucide icon name (e.g. Recycle, Leaf)
  color TEXT NOT NULL,         -- Hex color code (e.g. #10B981)
  rule_type TEXT NOT NULL,     -- e.g. total_weight, plastic_weight, paper_weight, metal_weight, glass_weight
  rule_value NUMERIC NOT NULL, -- The target threshold amount (e.g. 10.0 for 10 kg)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 3. Enable Row Level Security (RLS)
-- =========================================================================
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 4. RLS Policies
-- =========================================================================

-- SELECT policies: Anyone authenticated can read levels and badges
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.levels;
CREATE POLICY "Allow select for authenticated users" ON public.levels
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.badges;
CREATE POLICY "Allow select for authenticated users" ON public.badges
  FOR SELECT TO authenticated USING (true);

-- WRITE policies: Only admin and super_admin profiles can modify levels and badges
DROP POLICY IF EXISTS "Allow write for admins" ON public.levels;
CREATE POLICY "Allow write for admins" ON public.levels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Allow write for admins" ON public.badges;
CREATE POLICY "Allow write for admins" ON public.badges
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role IN ('admin', 'super_admin')
    )
  );

-- =========================================================================
-- 5. Seed Initial Data
-- =========================================================================

-- Default Levels
INSERT INTO public.levels (name, min_points, max_points, next_level_name) VALUES
  ('Eco Rookie', 0, 1000, 'Eco Enthusiast'),
  ('Eco Enthusiast', 1000, 2500, 'Waste Warrior'),
  ('Waste Warrior', 2500, 5000, 'Sustainability Hero'),
  ('Sustainability Hero', 5000, 10000, 'Elite Guardian')
ON CONFLICT (name) DO UPDATE SET
  min_points = EXCLUDED.min_points,
  max_points = EXCLUDED.max_points,
  next_level_name = EXCLUDED.next_level_name;

-- Default Badges
INSERT INTO public.badges (title, description, icon, color, rule_type, rule_value) VALUES
  ('Eco Pioneer', 'Completed your first recycling collection', 'Recycle', '#10B981', 'total_weight', 0.001),
  ('Plastic Purger', 'Recycled over 10 kg of plastic waste', 'Leaf', '#3B82F6', 'plastic_weight', 10.0),
  ('Forest Friend', 'Recycled over 20 kg of paper / cardboard', 'Award', '#8B5CF6', 'paper_weight', 20.0),
  ('Zero Waste Hero', 'Recycled more than 50 kg total weight', 'Sparkles', '#F59E0B', 'total_weight', 50.0)
ON CONFLICT (title) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  rule_type = EXCLUDED.rule_type,
  rule_value = EXCLUDED.rule_value;
