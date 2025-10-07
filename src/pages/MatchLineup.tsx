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

      // Generate Brownlow votes (3-2-1 format based on impact_score)
      const allPlayerStats = [...allStats].sort((a, b) => b.impact_score - a.impact_score);
      const brownlowVotes = [
        { player_id: allPlayerStats[0].player_id, team_id: allPlayerStats[0].team_id, votes: 3 },
        { player_id: allPlayerStats[1].player_id, team_id: allPlayerStats[1].team_id, votes: 2 },
        { player_id: allPlayerStats[2].player_id, team_id: allPlayerStats[2].team_id, votes: 1 },
      ].map(v => ({
        match_id: matchId,
        player_id: v.player_id,
        team_id: v.team_id,
        user_id: user.id,
        votes: v.votes,
        format: "3-2-1" as const
      }));

      const { error: votesError } = await supabase
        .from("brownlow_votes")
        .insert(brownlowVotes);

      if (votesError) throw votesError;

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
  
  // Form variance: 0.65-1.35 (allows for bigger swings between ratings and games)
  const form = 0.65 + Math.random() * 0.7;
  
  let disposals = 0;
  let goals = 0;
  let tackles = 0;
  let marks = 0;
  let hitouts = 0;
  let intercepts = 0;

  // Helper to get base stat from rating buckets with interpolation
  const getBaseStat = (buckets: number[]) => {
    const idx = Math.min(Math.floor((rating - 60) / 5), 7);
    const baseValue = buckets[idx] || buckets[0];
    // Add extra scaling based on rating within bucket to increase variance
    const withinBucketBonus = ((rating - 60) % 5) * 0.15;
    return baseValue + withinBucketBonus;
  };

  switch (position) {
    case "MID":
      // Disposals: 9.5-31, Marks: 1.5-5, Tackles: 1.5-6, Intercepts: 0.8-3.5
      const midDisposals = [9.5, 12.5, 16.5, 19.5, 22.5, 25.5, 28.5, 31];
      const midMarks = [1.5, 2.5, 2.5, 3, 3.5, 4, 4.5, 5];
      const midTackles = [1.5, 2, 2.5, 3.5, 4, 5, 5.5, 6];
      const midIntercepts = [0.8, 0.9, 1.2, 1.5, 2, 2.5, 3, 3.5];
      
      disposals = Math.round(getBaseStat(midDisposals) * form);
      marks = Math.round(getBaseStat(midMarks) * form);
      tackles = Math.round(getBaseStat(midTackles) * form);
      intercepts = Math.round(getBaseStat(midIntercepts) * form);
      goals = Math.random() < 0.15 ? Math.round(Math.random() * 2) : 0;
      break;

    case "HB":
    case "DEF":
      // Half-Back: Disposals: 9.5-30, Marks: 1.8-5.5, Tackles: 1.5-5, Intercepts: 1-4
      const hbDisposals = [9.5, 12.5, 15.5, 18.5, 21.5, 24.5, 27.5, 30];
      const hbMarks = [1.8, 2.5, 3, 3.5, 4, 4.5, 5, 5.5];
      const hbTackles = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
      const hbIntercepts = [1, 1.2, 1.6, 2, 2.5, 3, 3.5, 4];
      
      disposals = Math.round(getBaseStat(hbDisposals) * form);
      marks = Math.round(getBaseStat(hbMarks) * form);
      tackles = Math.round(getBaseStat(hbTackles) * form);
      intercepts = Math.round(getBaseStat(hbIntercepts) * form);
      goals = Math.random() < 0.03 ? 1 : 0;
      break;

    case "FWD":
      // Small Forward: Disposals: 5.5-14.5, Marks: 1-4.25, Tackles: 2-5.5, Goals: 0.2-2
      const fwdDisposals = [5.5, 7, 8.5, 9.5, 10.5, 12.5, 13.5, 14.5];
      const fwdMarks = [1, 1.5, 1.75, 2.25, 2.75, 3.25, 3.75, 4.25];
      const fwdTackles = [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5];
      const fwdGoals = [0.2, 0.4, 0.6, 0.95, 1.15, 1.4, 1.6, 2];
      
      disposals = Math.round(getBaseStat(fwdDisposals) * form);
      marks = Math.round(getBaseStat(fwdMarks) * form);
      tackles = Math.round(getBaseStat(fwdTackles) * form);
      goals = Math.round(getBaseStat(fwdGoals) * form + Math.random() - 0.3);
      goals = Math.max(0, goals);
      break;

    case "KFWD":
      // Key Forward: Disposals: 8.5-16, Marks: 1.5-7.5, Tackles: 1-2.25, Goals: 0.4-2.6
      const kfwdDisposals = [8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 16];
      const kfwdMarks = [1.5, 2, 2.5, 3.5, 4.25, 5, 6, 7.5];
      const kfwdTackles = [1, 1, 1.5, 1.5, 1.75, 2, 2, 2.25];
      const kfwdGoals = [0.4, 0.55, 0.8, 1.3, 1.55, 1.9, 2.15, 2.6];
      
      disposals = Math.round(getBaseStat(kfwdDisposals) * form);
      marks = Math.round(getBaseStat(kfwdMarks) * form);
      tackles = Math.round(getBaseStat(kfwdTackles) * form);
      goals = Math.round(getBaseStat(kfwdGoals) * form + Math.random() - 0.2);
      goals = Math.max(0, goals);
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
      
      disposals = Math.round(getBaseStat(rucDisposals) * form);
      marks = Math.round(getBaseStat(rucMarks) * form);
      tackles = Math.round((1 + rating / 50) * form);
      goals = Math.random() < 0.08 ? 1 : 0;
      break;

    case "KDEF":
      // Key Defender: Disposals: 8-22, Marks: 2-8, Intercepts: 0.8-5, Tackles: 0.5-4
      const kdefDisposals = [9, 10, 11.5, 13.5, 15, 16, 17.5, 19];
      const kdefMarks = [2.5, 3, 3.7, 4.2, 4.7, 5.2, 5.7, 7];
      const kdefIntercepts = [1.15, 1.4, 1.7, 2.1, 2.5, 3, 3.5, 4.2];
      const kdefTackles = [1, 1.4, 1.5, 1.7, 2, 2.4, 2.7, 3.2];
      
      disposals = Math.round(getBaseStat(kdefDisposals) * form);
      marks = Math.round(getBaseStat(kdefMarks) * form);
      intercepts = Math.round(getBaseStat(kdefIntercepts) * form);
      tackles = Math.round(getBaseStat(kdefTackles) * form);
      goals = Math.random() < 0.01 ? 1 : 0;
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
