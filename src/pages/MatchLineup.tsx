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

      // Calculate scores from goals and behinds
      const homeGoals = allStats.filter(s => s.team_id === homeTeam.teamId).reduce((sum, s) => sum + s.goals, 0);
      const homeBehinds = allStats.filter(s => s.team_id === homeTeam.teamId).reduce((sum, s) => sum + (s.behinds || 0), 0);
      const awayGoals = allStats.filter(s => s.team_id === awayTeam.teamId).reduce((sum, s) => sum + s.goals, 0);
      const awayBehinds = allStats.filter(s => s.team_id === awayTeam.teamId).reduce((sum, s) => sum + (s.behinds || 0), 0);
      
      // Team overall affects scoring slightly (60-99 range, 75 is average)
      const homeModifier = 0.95 + ((homeTeamData?.team_overall || 75) - 75) / 150;
      const awayModifier = 0.95 + ((awayTeamData?.team_overall || 75) - 75) / 150;
      
      // Random variance for score (0.85-1.15)
      const homeScoreVariance = 0.85 + Math.random() * 0.3;
      const awayScoreVariance = 0.85 + Math.random() * 0.3;

      const homeScore = Math.round((homeGoals * 6 + homeBehinds) * homeModifier * homeScoreVariance);
      const awayScore = Math.round((awayGoals * 6 + awayBehinds) * awayModifier * awayScoreVariance);

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
  
  // Form variance: 0.55-1.45 (wider range for more unpredictable games)
  const form = 0.55 + Math.random() * 0.9;
  
  // Individual player variance (makes players in same position have different games)
  const playerVariance = 0.75 + Math.random() * 0.5;
  
  let disposals = 0;
  let goals = 0;
  let behinds = 0;
  let tackles = 0;
  let marks = 0;
  let hitouts = 0;
  let intercepts = 0;

  // Helper to get base stat from rating buckets with within-bucket variance
  const getBaseStat = (buckets: number[]) => {
    const idx = Math.min(Math.floor((rating - 60) / 5), 7);
    const base = buckets[idx] || buckets[0];
    // Add variance within the bucket (±10%)
    const withinBucketBonus = (rating % 5) * 0.02;
    return base * (1 + withinBucketBonus);
  };

  switch (position) {
    case "MID":
      // MID: Focus on disposals and tackles
      const midDisposals = [9.5, 12.5, 16.5, 19.5, 22.5, 25.5, 28.5, 31];
      const midMarks = [1.2, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5];
      const midTackles = [1.5, 2, 2.5, 3.5, 4, 5, 5.5, 6];
      const midIntercepts = [0.5, 0.6, 0.8, 1, 1.2, 1.5, 1.8, 2];
      
      disposals = Math.round(getBaseStat(midDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(midMarks) * form * playerVariance * 0.8);
      tackles = Math.round(getBaseStat(midTackles) * form * playerVariance);
      intercepts = Math.round(getBaseStat(midIntercepts) * form * playerVariance * 0.7);
      goals = Math.random() < 0.12 ? Math.round(Math.random() * 2) : 0;
      behinds = goals > 0 && Math.random() < 0.4 ? Math.round(Math.random() * 2) : 0;
      break;

    case "HB":
    case "DEF":
      // DEF/HB: Focus on disposals, marks, some intercepts
      const hbDisposals = [9.5, 12.5, 15.5, 18.5, 21.5, 24.5, 27.5, 30];
      const hbMarks = [1.8, 2.5, 3, 3.5, 4, 4.5, 5, 5.5];
      const hbTackles = [1, 1.5, 1.8, 2, 2.5, 2.8, 3, 3.5];
      const hbIntercepts = [1, 1.2, 1.6, 2, 2.5, 3, 3.5, 4];
      
      disposals = Math.round(getBaseStat(hbDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(hbMarks) * form * playerVariance);
      tackles = Math.round(getBaseStat(hbTackles) * form * playerVariance * 0.85);
      intercepts = Math.round(getBaseStat(hbIntercepts) * form * playerVariance);
      goals = Math.random() < 0.03 ? 1 : 0;
      behinds = goals > 0 && Math.random() < 0.3 ? 1 : 0;
      break;

    case "FWD":
      // Small Forward: Can kick multiple goals but less than KFWD (avg ~1.8 over 10 games)
      const fwdDisposals = [5.5, 7, 8.5, 9.5, 10.5, 12.5, 13.5, 14.5];
      const fwdMarks = [1, 1.5, 1.75, 2.25, 2.75, 3.25, 3.75, 4.25];
      const fwdTackles = [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5];
      const fwdGoals = [0.15, 0.35, 0.55, 0.85, 1.05, 1.3, 1.5, 1.85];
      
      disposals = Math.round(getBaseStat(fwdDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(fwdMarks) * form * playerVariance);
      tackles = Math.round(getBaseStat(fwdTackles) * form * playerVariance);
      // FWD can have big games (3-5 goals) but often 0-2
      const fwdBaseGoals = getBaseStat(fwdGoals) * form * playerVariance;
      goals = Math.round(fwdBaseGoals + (Math.random() * 1.5 - 0.4));
      goals = Math.max(0, goals);
      behinds = Math.round(Math.random() * 2 + goals * 0.3);
      break;

    case "KFWD":
      // Key Forward: High variance (0-1 goals bad, up to 8-9 career best, avg ~2.7 over 10 games)
      const kfwdDisposals = [5.5, 6.5, 7.5, 8.5, 9, 9.5, 10, 10.5];
      const kfwdMarks = [1.5, 2, 2.5, 3.5, 4.25, 5, 6, 7.5];
      const kfwdTackles = [0.6, 0.7, 0.8, 1, 1.2, 1.4, 1.6, 1.8];
      const kfwdGoals = [0.4, 0.7, 1.1, 1.6, 2.1, 2.6, 3.1, 3.8];
      
      disposals = Math.round(getBaseStat(kfwdDisposals) * form * playerVariance * 0.85);
      marks = Math.round(getBaseStat(kfwdMarks) * form * playerVariance);
      tackles = Math.round(getBaseStat(kfwdTackles) * form * playerVariance * 0.8);
      // KFWD very high variance: can have 0-1 goal games or 6-9 goal bags
      const kfwdBaseGoals = getBaseStat(kfwdGoals);
      const goalVariance = form * playerVariance * (0.5 + Math.random() * 1.5);
      goals = Math.round(kfwdBaseGoals * goalVariance + (Math.random() * 2 - 0.6));
      goals = Math.max(0, Math.min(9, goals)); // Cap at 9 for career best
      behinds = Math.round(Math.random() * 3 + goals * 0.4);
      break;

    case "RUC":
      // Ruck: Hitouts based on opposition, Disposals: 4-14, Marks: 0.8-5
      const rucDisposals = [5, 6, 7, 8, 9, 10, 11.5, 12.5];
      const rucMarks = [1, 1.5, 1.8, 2.2, 2.7, 3.2, 3.7, 4.2];
      
      const opposingRucs = homeRucs.some(r => r.id === player.id) ? awayRucs : homeRucs;
      
      if (opposingRucs.length > 0) {
        // Two RUCs competing
        const opposingRating = opposingRucs[0].overall_rating;
        const ratingDiff = rating - opposingRating;
        
        // Base hitouts by rating bucket: 12.5, 17.5, 22.5, 27, 31.5, 35, 40, 47.5
        const baseHitouts = [12.5, 17.5, 22.5, 27, 31.5, 35, 40, 47.5];
        const myBase = getBaseStat(baseHitouts);
        
        // Adjust based on opposition (if opponent is better, you get fewer)
        hitouts = Math.round(myBase + (ratingDiff * 0.3) + (Math.random() * 6 - 3));
        hitouts = Math.max(8, Math.min(55, hitouts));
      } else {
        // Solo RUC dominates
        const soloHitouts = [12, 17, 22, 27, 31, 35, 40, 47];
        hitouts = Math.round(getBaseStat(soloHitouts) * 1.3 + Math.random() * 8);
        hitouts = Math.max(30, hitouts);
      }
      
      disposals = Math.round(getBaseStat(rucDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(rucMarks) * form * playerVariance);
      tackles = Math.round((1 + rating / 50) * form * playerVariance);
      goals = Math.random() < 0.08 ? 1 : 0;
      break;

    case "KDEF":
      // Key Defender: Not many disposals/tackles, but good marks and intercepts
      const kdefDisposals = [7, 8, 9.5, 11, 12.5, 13.5, 14.5, 15.5];
      const kdefMarks = [2.5, 3, 3.7, 4.2, 4.7, 5.2, 5.7, 7];
      const kdefIntercepts = [1.15, 1.4, 1.7, 2.1, 2.5, 3, 3.5, 4.2];
      const kdefTackles = [0.8, 1, 1.2, 1.4, 1.6, 1.9, 2.2, 2.6];
      
      disposals = Math.round(getBaseStat(kdefDisposals) * form * playerVariance * 0.9);
      marks = Math.round(getBaseStat(kdefMarks) * form * playerVariance);
      intercepts = Math.round(getBaseStat(kdefIntercepts) * form * playerVariance);
      tackles = Math.round(getBaseStat(kdefTackles) * form * playerVariance * 0.85);
      goals = Math.random() < 0.01 ? 1 : 0;
      behinds = goals > 0 && Math.random() < 0.2 ? 1 : 0;
      break;
  }

  // Fantasy: 3 disposal, 6 goal, 1 behind, 4 tackle, 3 mark, 4 intercept, 1 hitout
  const fantasyScore = 
    disposals * 3 + 
    goals * 6 + 
    behinds * 1 +
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
    behinds,
    tackles,
    marks,
    impact_score: Math.round(impactScore * 100) / 100,
    fantasy_score: fantasyScore,
    intercepts,
    hitouts
  };
}
