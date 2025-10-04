-- Create coaches_votes table
CREATE TABLE public.coaches_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  player_id UUID NOT NULL,
  team_id UUID NOT NULL,
  user_id UUID NOT NULL,
  votes INTEGER NOT NULL CHECK (votes >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Enable RLS
ALTER TABLE public.coaches_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own coaches votes"
  ON public.coaches_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coaches votes"
  ON public.coaches_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaches votes"
  ON public.coaches_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coaches votes"
  ON public.coaches_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Create brownlow_votes table
CREATE TABLE public.brownlow_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  player_id UUID NOT NULL,
  team_id UUID NOT NULL,
  user_id UUID NOT NULL,
  votes INTEGER NOT NULL CHECK (votes >= 0),
  format TEXT NOT NULL CHECK (format IN ('3-2-1', '5-4-3-2-1')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Enable RLS
ALTER TABLE public.brownlow_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own brownlow votes"
  ON public.brownlow_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brownlow votes"
  ON public.brownlow_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brownlow votes"
  ON public.brownlow_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brownlow votes"
  ON public.brownlow_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Create match_stats table to store player performance
CREATE TABLE public.match_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  player_id UUID NOT NULL,
  team_id UUID NOT NULL,
  user_id UUID NOT NULL,
  disposals INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  tackles INTEGER DEFAULT 0,
  marks INTEGER DEFAULT 0,
  impact_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Enable RLS
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own match stats"
  ON public.match_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own match stats"
  ON public.match_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own match stats"
  ON public.match_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own match stats"
  ON public.match_stats FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for match_stats updated_at
CREATE TRIGGER update_match_stats_updated_at
  BEFORE UPDATE ON public.match_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();