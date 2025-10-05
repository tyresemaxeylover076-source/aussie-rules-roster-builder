-- Add score columns to matches table
ALTER TABLE matches 
ADD COLUMN home_score integer DEFAULT 0,
ADD COLUMN away_score integer DEFAULT 0;

-- Add fantasy_score, intercepts, and hitouts columns to match_stats table
ALTER TABLE match_stats 
ADD COLUMN fantasy_score integer DEFAULT 0,
ADD COLUMN intercepts integer DEFAULT 0,
ADD COLUMN hitouts integer DEFAULT 0;