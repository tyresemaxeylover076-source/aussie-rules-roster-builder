-- Fix search_path for validate_player_rating function
CREATE OR REPLACE FUNCTION validate_player_rating()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.overall_rating < 60 OR NEW.overall_rating > 99 THEN
    RAISE EXCEPTION 'Overall rating must be between 60 and 99';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;