-- Update player position validation to include KFWD and KDEF
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_favorite_position_check;
ALTER TABLE public.players ADD CONSTRAINT players_favorite_position_check 
  CHECK (favorite_position IN ('FWD', 'KFWD', 'MID', 'DEF', 'KDEF', 'RUC'));

-- Update match lineup position validation
ALTER TABLE public.match_lineups DROP CONSTRAINT IF EXISTS match_lineups_position_check;
ALTER TABLE public.match_lineups ADD CONSTRAINT match_lineups_position_check 
  CHECK (position IN ('FWD', 'KFWD', 'MID', 'DEF', 'KDEF', 'RUC', 'INT'));