-- 1. Create a secure RPC function to record weights, calculate coins, and attribute them
CREATE OR REPLACE FUNCTION public.collect_pickup(
  p_pickup_id UUID,
  p_items JSONB -- Array of {item_id: UUID, weight_kg: NUMERIC}
)
RETURNS VOID AS $$
DECLARE
  v_agent_id UUID;
  v_user_id UUID;
  v_caller_role TEXT;
  v_item RECORD;
  v_coins_earned INT;
  v_coins_rate INT;
  v_total_coins INT := 0;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller's role (admin, super_admin, or agent)
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'super_admin', 'agent') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get pickup details
  SELECT agent_id, user_id INTO v_agent_id, v_user_id FROM public.pickups WHERE id = p_pickup_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pickup not found';
  END IF;

  -- Verify agent assignment
  IF v_caller_role = 'agent' AND v_agent_id != auth.uid() THEN
    RAISE EXCEPTION 'This pickup is not assigned to you';
  END IF;

  -- Process and update each item's weight and calculate earned coins
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id UUID, weight_kg NUMERIC)
  LOOP
    -- Get the material rate
    SELECT m.eco_coins_per_kg INTO v_coins_rate
    FROM public.pickup_items pi
    JOIN public.materials m ON m.id = pi.material_id
    WHERE pi.id = v_item.item_id AND pi.pickup_id = p_pickup_id;

    IF FOUND THEN
      -- Calculate coins (rounded to nearest integer)
      v_coins_earned := ROUND(v_item.weight_kg * v_coins_rate);
      v_total_coins := v_total_coins + v_coins_earned;

      -- Update the weight and coins for the specific item
      UPDATE public.pickup_items
      SET weight_kg = v_item.weight_kg,
          eco_coins_earned = v_coins_earned
      WHERE id = v_item.item_id;
    END IF;
  END LOOP;

  -- Update pickup status and total coins
  UPDATE public.pickups
  SET status = 'collected',
      total_eco_coins_earned = v_total_coins
  WHERE id = p_pickup_id;

  -- Credit user profile balance
  UPDATE public.profiles
  SET eco_coins_balance = eco_coins_balance + v_total_coins
  WHERE id = v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add UPDATE policy for pickup_items table so agents/admins can modify details
DROP POLICY IF EXISTS "Admins and agents can update pickup items" ON public.pickup_items;
CREATE POLICY "Admins and agents can update pickup items" ON public.pickup_items
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

-- 3. Set default of 0 on eco_coins_earned column in pickup_items table
ALTER TABLE public.pickup_items ALTER COLUMN eco_coins_earned SET DEFAULT 0;
