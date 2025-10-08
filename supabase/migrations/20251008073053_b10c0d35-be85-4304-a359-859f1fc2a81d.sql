-- Add behinds column to match_stats table
ALTER TABLE match_stats 
ADD COLUMN behinds integer DEFAULT 0;