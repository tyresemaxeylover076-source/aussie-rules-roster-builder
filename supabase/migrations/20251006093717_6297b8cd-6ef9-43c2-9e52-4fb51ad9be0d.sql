-- Add team_overall column to teams table
ALTER TABLE public.teams
ADD COLUMN team_overall integer DEFAULT 75 CHECK (team_overall >= 60 AND team_overall <= 99);

COMMENT ON COLUMN public.teams.team_overall IS 'Team overall rating (60-99) that affects match scores but not individual player stats';