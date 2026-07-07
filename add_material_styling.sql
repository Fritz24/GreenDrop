-- SQL to run in Supabase SQL Editor
-- Adds icon and color fields to the materials table based on recycling standards.

ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS color TEXT;

-- Update Plastic (Yellow/Orange bin standard)
UPDATE public.materials 
SET icon = 'CupSoda', color = '#F59E0B'
WHERE name = 'Plastic';

-- Update Paper (Blue bin standard)
UPDATE public.materials 
SET icon = 'FileText', color = '#3B82F6'
WHERE name = 'Paper';

-- Update Aluminum (Gray/Silver standard)
UPDATE public.materials 
SET icon = 'Layers', color = '#94A3B8'
WHERE name = 'Aluminum';

-- Update Glass (Green bin standard)
UPDATE public.materials 
SET icon = 'Wine', color = '#10B981'
WHERE name = 'Glass';

-- Insert Iron (Ferromagnetic standard) safely without requiring unique constraints
INSERT INTO public.materials (name, eco_coins_per_kg, icon, color)
SELECT 'Iron', 12, 'Magnet', '#4B5563'
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials WHERE name = 'Iron'
);

-- Apply standard rate, icon, and color values for Iron
UPDATE public.materials 
SET eco_coins_per_kg = 12, icon = 'Magnet', color = '#4B5563'
WHERE name = 'Iron';


