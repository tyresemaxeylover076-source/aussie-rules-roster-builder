import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  favorite_position: string;
  overall_rating: number;
}

interface TeamPlayers {
  teamId: string;
  teamName: string;
  players: Player[];
  selected: Set<string>;
}

export default function MatchLineup() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [homeTeam, setHomeTeam] = useState<TeamPlayers | null>(null);
  const [awayTeam, setAwayTeam] = useState<TeamPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    loadMatchAndPlayers();
  }, [matchId]);

  const loadMatchAndPlayers = async () => {
    if (!matchId) return;

    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*, home_team:teams!home_team_id(id, name), away_team:teams!away_team_id(id, name)")
        .eq("id", matchId)
        .single();

      if (matchError) throw matchError;

      const { data: homePlayers, error: homeError } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", matchData.home_team_id)
        .order("overall_rating", { ascending: false });

      const { data: awayPlayers, error: awayError } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", matchData.away_team_id)
        .order("overall_rating", { ascending: false });

      if (homeError) throw homeError;
      if (awayError) throw awayError;

      setHomeTeam({
        teamId: matchData.home_team_id,
        teamName: (matchData.home_team as any).name,
        players: homePlayers || [],
        selected: new Set(homePlayers?.slice(0, 21).map(p => p.id) || [])
      });

      setAwayTeam({
        teamId: matchData.away_team_id,
        teamName: (matchData.away_team as any).name,
        players: awayPlayers || [],
        selected: new Set(awayPlayers?.slice(0, 21).map(p => p.id) || [])
      });
    } catch (error) {
      console.error("Error loading match:", error);
      toast.error("Failed to load match");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayer = (teamType: 'home' | 'away', playerId: string) => {
    const team = teamType === 'home' ? homeTeam : awayTeam;
    const setTeam = teamType === 'home' ? setHomeTeam : setAwayTeam;
    
    if (!team) return;

    const newSelected = new Set(team.selected);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      if (newSelected.size >= 21) {
        toast.error("Maximum 21 players can be selected");
        return;
      }
      newSelected.add(playerId);
    }

    setTeam({ ...team, selected: newSelected });
  };

  const simulateMatch = async () => {
    if (!homeTeam || !awayTeam || !matchId) return;

    if (homeTeam.selected.size !== 21) {
      toast.error("Home team must have exactly 21 players selected");
      return;
    }

    if (awayTeam.selected.size !== 21) {
      toast.error("Away team must have exactly 21 players selected");
      return;
    }

    setIsSimulating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save lineups
      const lineupData = [
        ...Array.from(homeTeam.selected).map((playerId, idx) => ({
          match_id: matchId,
          team_id: homeTeam.teamId,
          player_id: playerId,
          user_id: user.id,
          is_starting: idx < 18,
          position: homeTeam.players.find(p => p.id === playerId)?.favorite_position || "MID"
        })),
        ...Array.from(awayTeam.selected).map((playerId, idx) => ({
          match_id: matchId,
          team_id: awayTeam.teamId,
          player_id: playerId,
          user_id: user.id,
          is_starting: idx < 18,
          position: awayTeam.players.find(p => p.id === playerId)?.favorite_position || "MID"
        }))
      ];

      const { error: lineupError } = await supabase
        .from("match_lineups")
        .insert(lineupData);

      if (lineupError) throw lineupError;

      // Simulate the match using the same logic
      const selectedHomePlayers = homeTeam.players.filter(p => homeTeam.selected.has(p.id));
      const selectedAwayPlayers = awayTeam.players.filter(p => awayTeam.selected.has(p.id));

      // Count RUCs on each team for hitout distribution
      const homeRucs = selectedHomePlayers.filter(p => p.favorite_position === "RUC");
      const awayRucs = selectedAwayPlayers.filter(p => p.favorite_position === "RUC");

      const allStats = [
        ...selectedHomePlayers.map(p => generatePlayerStats(p, matchId, homeTeam.teamId, user.id, homeRucs, awayRucs)),
        ...selectedAwayPlayers.map(p => generatePlayerStats(p, matchId, awayTeam.teamId, user.id, homeRucs, awayRucs))
      ];

      const { error: statsError } = await supabase
        .from("match_stats")
        .insert(allStats);

      if (statsError) throw statsError;

      // Fetch team overalls for scoring modifier
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, team_overall")
        .in("id", [homeTeam.teamId, awayTeam.teamId]);

      const homeTeamData = teamsData?.find(t => t.id === homeTeam.teamId);
      const awayTeamData = teamsData?.find(t => t.id === awayTeam.teamId);

      // Team overall affects scoring (60-99 range, 75 is average)
      // Higher overall = slight scoring boost
      const homeModifier = 1 + ((homeTeamData?.team_overall || 75) - 75) / 100;
      const awayModifier = 1 + ((awayTeamData?.team_overall || 75) - 75) / 100;

      // Calculate scores with team overall modifier
      const homeScore = Math.round(allStats
        .filter(s => s.team_id === homeTeam.teamId)
        .reduce((sum, s) => sum + (s.goals * 6), 0) * homeModifier);
      
      const awayScore = Math.round(allStats
        .filter(s => s.team_id === awayTeam.teamId)
        .reduce((sum, s) => sum + (s.goals * 6), 0) * awayModifier);

      // Update match with scores
      const { error: updateError } = await supabase
        .from("matches")
        .update({ 
          status: "completed",
          home_score: homeScore,
          away_score: awayScore
        })
        .eq("id", matchId);

      if (updateError) throw updateError;

      toast.success("Match simulated successfully!");
      navigate(`/match/${matchId}/results`);
    } catch (error) {
      console.error("Error simulating match:", error);
      toast.error("Failed to simulate match");
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold">Select Match Lineup</h1>
          </div>
          <Button onClick={simulateMatch} disabled={isSimulating}>
            {isSimulating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Simulating...
              </>
            ) : (
              "Simulate Match"
            )}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {homeTeam && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">{homeTeam.teamName} (Home)</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Selected: {homeTeam.selected.size}/21 (18 starting + 3 interchange)
              </p>
              <div className="space-y-2">
                {homeTeam.players.map((player) => (
                  <div key={player.id} className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded">
                    <Checkbox
                      checked={homeTeam.selected.has(player.id)}
                      onCheckedChange={() => togglePlayer('home', player.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.favorite_position} • {player.overall_rating} OVR
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {awayTeam && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">{awayTeam.teamName} (Away)</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Selected: {awayTeam.selected.size}/21 (18 starting + 3 interchange)
              </p>
              <div className="space-y-2">
                {awayTeam.players.map((player) => (
                  <div key={player.id} className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded">
                    <Checkbox
                      checked={awayTeam.selected.has(player.id)}
                      onCheckedChange={() => togglePlayer('away', player.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.favorite_position} • {player.overall_rating} OVR
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function generatePlayerStats(player: any, matchId: string, teamId: string, userId: string, homeRucs: Player[], awayRucs: Player[]) {
  const position = player.favorite_position;
  const rating = player.overall_rating;
  
  // Form factor: 0.4-1.15 (good players can have bad games, bad players can have rare great games)
  const form = 0.4 + Math.random() * 0.75;
  const effectiveRating = rating * form;
  
  let disposals = 0;
  let goals = 0;
  let tackles = 0;
  let marks = 0;
  let hitouts = 0;
  let intercepts = 0;

  switch (position) {
    case "KFWD":
      // Best KFWD average 2.6-3.6 goals per game
      goals = Math.max(0, Math.round((effectiveRating / 50) + Math.random() * 2));
      disposals = Math.round(3 + (effectiveRating / 25) + Math.random() * 3);
      marks = Math.round(1 + (effectiveRating / 50) + Math.random() * 2);
      tackles = Math.round(Math.random() * 2);
      hitouts = Math.random() < 0.08 ? Math.round(Math.random() * 2) : 0;
      break;

    case "FWD":
      // Fewer goals than KFWD but more disposals
      goals = Math.max(0, Math.round((effectiveRating / 70) + Math.random() * 1.2));
      disposals = Math.round(6 + (effectiveRating / 15) + Math.random() * 4);
      marks = Math.round(1 + (effectiveRating / 40) + Math.random() * 2);
      tackles = Math.round(1 + Math.random() * 2);
      hitouts = Math.random() < 0.04 ? 1 : 0;
      break;

    case "MID":
      // Best mids (92 rating) average 28-33, rarely hit 40
      // At form=1.0: 92 rating → ~30 disposals, at form=0.6: ~22 disposals
      disposals = Math.round(6 + (effectiveRating / 4.2) + Math.random() * 4);
      goals = Math.random() < 0.2 ? Math.round(Math.random() * 2) : 0;
      tackles = Math.round(1 + (effectiveRating / 30) + Math.random() * 3);
      marks = Math.round(1 + (effectiveRating / 60) + Math.random() * 2);
      intercepts = Math.round((effectiveRating / 100) + Math.random() * 1);
      break;

    case "RUC":
      // Hitouts based on opposition
      const opposingRucs = homeRucs.some(r => r.id === player.id) ? awayRucs : homeRucs;
      
      if (opposingRucs.length > 0) {
        // Two RUCs competing: 20-30 hitouts based on rating advantage
        const opposingRating = opposingRucs[0].overall_rating;
        const ratingDiff = rating - opposingRating;
        // Base 25 hitouts, +/- based on rating difference
        hitouts = Math.round(25 + (ratingDiff / 4) + Math.random() * 5 - 2.5);
        hitouts = Math.max(18, Math.min(32, hitouts)); // Clamp to 18-32
      } else {
        // Solo RUC dominates: 35-60 hitouts based on rating
        hitouts = Math.round(35 + ((rating - 60) / 2) + Math.random() * 10);
        hitouts = Math.max(35, Math.min(60, hitouts));
      }
      
      disposals = Math.round(6 + (effectiveRating / 12) + Math.random() * 4);
      tackles = Math.round(1 + (effectiveRating / 35) + Math.random() * 2);
      marks = Math.round(1 + Math.random() * 2);
      goals = Math.random() < 0.1 ? 1 : 0;
      break;

    case "DEF":
      // Best DEF get 20-33 disposals on a good day, 9-16 on bad
      disposals = Math.round(5 + (effectiveRating / 4.5) + Math.random() * 6);
      marks = Math.round(1 + (effectiveRating / 35) + Math.random() * 2);
      tackles = Math.round(1 + (effectiveRating / 40) + Math.random() * 2);
      intercepts = Math.round(1 + (effectiveRating / 50) + Math.random() * 2);
      goals = Math.random() < 0.02 ? 1 : 0;
      break;

    case "KDEF":
      // Not many disposals, rare goals, lots of marks (4-12), intercepts are best stat
      disposals = Math.round(4 + (effectiveRating / 30) + Math.random() * 3);
      marks = Math.round(2 + (effectiveRating / 25) + Math.random() * 4);
      intercepts = Math.round(2 + (effectiveRating / 30) + Math.random() * 4);
      tackles = Math.round(Math.random() * 2);
      goals = Math.random() < 0.008 ? 1 : 0;
      hitouts = Math.random() < 0.06 ? Math.round(Math.random() * 2) : 0;
      break;
  }

  // Fantasy: 2 disposal, 6 goal, 4 tackle, 3 mark, 4 intercept, 1 hitout
  const fantasyScore = 
    disposals * 2 + 
    goals * 6 + 
    tackles * 4 + 
    marks * 3 + 
    intercepts * 4 +
    hitouts * 1;

  let impactScore = 
    goals * 8 + 
    disposals * 0.8 + 
    tackles * 1.5 + 
    marks * 1.2 + 
    hitouts * 0.15 +
    intercepts * 1.8;

  if (disposals >= 30) impactScore += 5;
  if (goals >= 4) impactScore += 6;
  if (hitouts >= 45) impactScore += 4;
  if (intercepts >= 6) impactScore += 3;

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
