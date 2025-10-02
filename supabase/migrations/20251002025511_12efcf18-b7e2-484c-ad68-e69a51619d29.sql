-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#1e40af',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for teams
CREATE POLICY "Users can view their own teams"
  ON public.teams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teams"
  ON public.teams FOR DELETE
  USING (auth.uid() = user_id);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  favorite_position TEXT NOT NULL CHECK (favorite_position IN ('FWD', 'MID', 'DEF', 'RUC')),
  overall_rating INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add validation trigger for overall_rating instead of CHECK constraint
CREATE OR REPLACE FUNCTION validate_player_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.overall_rating < 60 OR NEW.overall_rating > 99 THEN
    RAISE EXCEPTION 'Overall rating must be between 60 and 99';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_player_rating_trigger
  BEFORE INSERT OR UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION validate_player_rating();

-- Enable RLS on players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for players
CREATE POLICY "Users can view their own players"
  ON public.players FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own players"
  ON public.players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own players"
  ON public.players FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own players"
  ON public.players FOR DELETE
  USING (auth.uid() = user_id);

-- Create matches table for future use
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'setup' CHECK (status IN ('setup', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for matches
CREATE POLICY "Users can view their own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches"
  ON public.matches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matches"
  ON public.matches FOR DELETE
  USING (auth.uid() = user_id);

-- Create match_lineups table
CREATE TABLE public.match_lineups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('FWD', 'MID', 'DEF', 'RUC', 'INT')),
  is_starting BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on match_lineups
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for match_lineups
CREATE POLICY "Users can view their own match lineups"
  ON public.match_lineups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own match lineups"
  ON public.match_lineups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own match lineups"
  ON public.match_lineups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own match lineups"
  ON public.match_lineups FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();