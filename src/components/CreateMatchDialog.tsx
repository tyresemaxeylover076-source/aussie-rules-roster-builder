import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Team {
  id: string;
  name: string;
  color: string;
}

export function CreateMatchDialog() {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name");

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
    }
  };

  const handleCreateMatch = async () => {
    if (!homeTeamId || !awayTeamId) {
      toast.error("Please select both teams");
      return;
    }

    if (homeTeamId === awayTeamId) {
      toast.error("Please select different teams");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if both teams have at least 21 players
      const [homePlayersCheck, awayPlayersCheck] = await Promise.all([
        supabase.from("players").select("id", { count: "exact", head: true }).eq("team_id", homeTeamId),
        supabase.from("players").select("id", { count: "exact", head: true }).eq("team_id", awayTeamId)
      ]);

      if ((homePlayersCheck.count || 0) < 21) {
        toast.error("Home team needs at least 21 players");
        setLoading(false);
        return;
      }

      if ((awayPlayersCheck.count || 0) < 21) {
        toast.error("Away team needs at least 21 players");
        setLoading(false);
        return;
      }

      // Create match
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .insert({
          user_id: user.id,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          status: "setup"
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Navigate to lineup selection
      setOpen(false);
      navigate(`/match/${matchData.id}/lineup`);
    } catch (error) {
      console.error("Error creating match:", error);
      toast.error("Failed to create match");
    } finally {
      setLoading(false);
    }
  };

  const simulateMatch = async (matchId: string, homeTeamId: string, awayTeamId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch all players from both teams
      const { data: homePlayers, error: homeError } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", homeTeamId)
        .order("overall_rating", { ascending: false });

      const { data: awayPlayers, error: awayError } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", awayTeamId)
        .order("overall_rating", { ascending: false });

      if (homeError) throw homeError;
      if (awayError) throw awayError;

      // Get selected lineup players
      const { data: lineupPlayers } = await supabase
        .from("match_lineups")
        .select("player_id, team_id")
        .eq("match_id", matchId);

      if (!lineupPlayers || lineupPlayers.length === 0) {
        throw new Error("No lineup selected");
      }

      // Generate stats only for selected players
      const allStats = lineupPlayers.map(lineup => {
        const player = [...(homePlayers || []), ...(awayPlayers || [])].find(p => p.id === lineup.player_id);
        if (!player) return null;
        return generatePlayerStats(player, matchId, lineup.team_id, user.id);
      }).filter(Boolean);

      // Insert match stats
      const { error: statsError } = await supabase
        .from("match_stats")
        .insert(allStats);

      if (statsError) throw statsError;

      // Calculate final scores
      const homeStats = allStats.filter(s => s.team_id === homeTeamId);
      const awayStats = allStats.filter(s => s.team_id === awayTeamId);
      
      const homeScore = homeStats.reduce((sum, s) => sum + (s.goals * 6), 0);
      const awayScore = awayStats.reduce((sum, s) => sum + (s.goals * 6), 0);

      // Update match status with scores
      const { error: updateError } = await supabase
        .from("matches")
        .update({ 
          status: "completed",
          home_score: homeScore,
          away_score: awayScore
        })
        .eq("id", matchId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error("Error simulating match:", error);
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Swords className="h-4 w-4" />
          Create Match
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Match</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Home Team</label>
            <Select value={homeTeamId} onValueChange={setHomeTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select home team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Away Team</label>
            <Select value={awayTeamId} onValueChange={setAwayTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select away team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

            <Button 
            onClick={handleCreateMatch} 
            disabled={loading || !homeTeamId || !awayTeamId}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Match"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function generatePlayerStats(player: any, matchId: string, teamId: string, userId: string) {
  const position = player.favorite_position;
  const rating = player.overall_rating;
  
  // Form factor (70-130% of normal performance)
  const form = 0.7 + Math.random() * 0.6;
  const effectiveRating = rating * form;
  
  let disposals = 0;
  let goals = 0;
  let tackles = 0;
  let marks = 0;
  let hitouts = 0;
  let intercepts = 0;

  switch (position) {
    case "KFWD":
      // KFWD: Lots of goals (3-6 for elite), not many disposals (6-14)
      goals = Math.max(0, Math.round((effectiveRating / 25) + Math.random() * 3));
      disposals = Math.round(6 + (effectiveRating / 15) + Math.random() * 4);
      marks = Math.round(3 + (effectiveRating / 30) + Math.random() * 3);
      tackles = Math.round(1 + Math.random() * 2);
      break;

    case "FWD":
      // FWD: Less goals than KFWD (1-4), more disposals (10-18)
      goals = Math.max(0, Math.round((effectiveRating / 35) + Math.random() * 2));
      disposals = Math.round(10 + (effectiveRating / 10) + Math.random() * 5);
      marks = Math.round(3 + (effectiveRating / 25) + Math.random() * 3);
      tackles = Math.round(2 + Math.random() * 3);
      break;

    case "MID":
      // MID: Best get 25+ disposals, can have off games, sometimes 1-2 goals
      disposals = Math.round(12 + (effectiveRating / 4) + Math.random() * 8);
      goals = Math.random() < 0.3 ? Math.round(Math.random() * 2) : 0; // 30% chance of 1-2 goals
      tackles = Math.round(3 + (effectiveRating / 20) + Math.random() * 4);
      marks = Math.round(2 + (effectiveRating / 30) + Math.random() * 3);
      break;

    case "RUC":
      // RUC: Lots of hitouts, medium disposals, some tackles, rare goals
      hitouts = Math.round(15 + (effectiveRating / 3) + Math.random() * 15);
      disposals = Math.round(10 + (effectiveRating / 8) + Math.random() * 6);
      tackles = Math.round(2 + (effectiveRating / 25) + Math.random() * 3);
      marks = Math.round(2 + Math.random() * 3);
      goals = Math.random() < 0.15 ? 1 : 0; // 15% chance of 1 goal
      break;

    case "DEF":
      // DEF: Best get 20-33 disposals on good days, 9-16 on bad, rare goals
      disposals = Math.round(9 + (effectiveRating / 4) + Math.random() * 10);
      marks = Math.round(3 + (effectiveRating / 25) + Math.random() * 4);
      tackles = Math.round(2 + (effectiveRating / 30) + Math.random() * 3);
      intercepts = Math.round(2 + (effectiveRating / 30) + Math.random() * 3);
      goals = Math.random() < 0.05 ? 1 : 0; // 5% chance of 1 goal
      break;

    case "KDEF":
      // KDEF: Not many disposals, very rare goals, lots of marks (4-12), intercepts
      disposals = Math.round(6 + (effectiveRating / 15) + Math.random() * 5);
      marks = Math.round(4 + (effectiveRating / 15) + Math.random() * 5);
      intercepts = Math.round(3 + (effectiveRating / 20) + Math.random() * 5);
      tackles = Math.round(1 + Math.random() * 2);
      goals = Math.random() < 0.02 ? 1 : 0; // 2% chance of 1 goal
      break;
  }

  // Calculate fantasy score: 3 disposal, 6 goal, 4 tackle, 3 mark, 5 intercept
  const fantasyScore = 
    disposals * 3 + 
    goals * 6 + 
    tackles * 4 + 
    marks * 3 + 
    intercepts * 5;

  // Calculate impact score for votes (goals weighted heavily)
  let impactScore = 
    goals * 8 + 
    disposals * 0.8 + 
    tackles * 1.5 + 
    marks * 1.2 + 
    hitouts * 0.15 +
    intercepts * 1.8;

  // Elite performances get bonus
  if (disposals >= 30) impactScore += 5;
  if (goals >= 5) impactScore += 8;
  if (hitouts >= 40) impactScore += 4;
  if (intercepts >= 8) impactScore += 4;

  return {
    match_id: matchId,
    player_id: player.id,
    team_id: teamId,
    user_id: userId,
    disposals,
    goals,
    tackles,
    marks,
    impact_score: Math.round(impactScore * 100) / 100,
    fantasy_score: fantasyScore,
    intercepts,
    hitouts
  };
}
