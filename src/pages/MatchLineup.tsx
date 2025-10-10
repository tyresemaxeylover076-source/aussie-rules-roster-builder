import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Player {
  id: string;
  name: string;
  favorite_position: string;
  overall_rating: number;
}

interface PositionSlot {
  position: string;
  playerId: string | null;
  adjustedOverall: number | null;
}

interface TeamLineup {
  teamId: string;
  teamName: string;
  players: Player[];
  positions: {
    KDEF: PositionSlot[];
    DEF: PositionSlot[];
    MID: PositionSlot[];
    RUC: PositionSlot[];
    FWD: PositionSlot[];
    KFWD: PositionSlot[];
    INT: PositionSlot[];
  };
}

const POSITION_REQUIREMENTS = {
  KDEF: 3,
  DEF: 3,
  MID: 5,
  RUC: 1,
  FWD: 3,
  KFWD: 3,
  INT: 3,
};

export default function MatchLineup() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [homeTeam, setHomeTeam] = useState<TeamLineup | null>(null);
  const [awayTeam, setAwayTeam] = useState<TeamLineup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    loadMatchAndPlayers();
  }, [matchId]);

  const createEmptyPositions = () => ({
    KDEF: Array(3).fill(null).map(() => ({ position: "KDEF", playerId: null, adjustedOverall: null })),
    DEF: Array(3).fill(null).map(() => ({ position: "DEF", playerId: null, adjustedOverall: null })),
    MID: Array(5).fill(null).map(() => ({ position: "MID", playerId: null, adjustedOverall: null })),
    RUC: Array(1).fill(null).map(() => ({ position: "RUC", playerId: null, adjustedOverall: null })),
    FWD: Array(3).fill(null).map(() => ({ position: "FWD", playerId: null, adjustedOverall: null })),
    KFWD: Array(3).fill(null).map(() => ({ position: "KFWD", playerId: null, adjustedOverall: null })),
    INT: Array(3).fill(null).map(() => ({ position: "INT", playerId: null, adjustedOverall: null })),
  });

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
        positions: createEmptyPositions(),
      });

      setAwayTeam({
        teamId: matchData.away_team_id,
        teamName: (matchData.away_team as any).name,
        players: awayPlayers || [],
        positions: createEmptyPositions(),
      });
    } catch (error) {
      console.error("Error loading match:", error);
      toast.error("Failed to load match");
    } finally {
      setIsLoading(false);
    }
  };

  const assignPlayer = (teamType: 'home' | 'away', position: string, slotIndex: number, playerId: string) => {
    const team = teamType === 'home' ? homeTeam : awayTeam;
    const setTeam = teamType === 'home' ? setHomeTeam : setAwayTeam;
    
    if (!team) return;

    const player = team.players.find(p => p.id === playerId);
    if (!player) return;

    // Check if player is already assigned elsewhere
    const isAssigned = Object.entries(team.positions).some(([pos, slots]) => 
      slots.some(slot => slot.playerId === playerId)
    );

    if (isAssigned) {
      toast.error("Player is already assigned to a position");
      return;
    }

    // Calculate adjusted overall if out of position
    let adjustedOverall = player.overall_rating;
    if (player.favorite_position !== position) {
      // Out of position penalty: -5 to -10 depending on how different
      const positionGroups = {
        defense: ['KDEF', 'DEF'],
        midfield: ['MID', 'RUC'],
        forward: ['KFWD', 'FWD']
      };
      
      const playerGroup = Object.entries(positionGroups).find(([_, positions]) => 
        positions.includes(player.favorite_position)
      )?.[0];
      
      const assignedGroup = Object.entries(positionGroups).find(([_, positions]) => 
        positions.includes(position)
      )?.[0];

      if (playerGroup !== assignedGroup) {
        adjustedOverall = player.overall_rating - 8; // Different line
      } else {
        adjustedOverall = player.overall_rating - 3; // Same line, different role
      }
    }

    const newPositions = { ...team.positions };
    newPositions[position as keyof typeof newPositions][slotIndex] = {
      position,
      playerId,
      adjustedOverall,
    };

    setTeam({ ...team, positions: newPositions });
  };

  const updateAdjustedOverall = (teamType: 'home' | 'away', position: string, slotIndex: number, value: string) => {
    const team = teamType === 'home' ? homeTeam : awayTeam;
    const setTeam = teamType === 'home' ? setHomeTeam : setAwayTeam;
    
    if (!team) return;

    const overall = parseInt(value);
    if (isNaN(overall) || overall < 60 || overall > 99) return;

    const newPositions = { ...team.positions };
    newPositions[position as keyof typeof newPositions][slotIndex].adjustedOverall = overall;

    setTeam({ ...team, positions: newPositions });
  };

  const clearPosition = (teamType: 'home' | 'away', position: string, slotIndex: number) => {
    const team = teamType === 'home' ? homeTeam : awayTeam;
    const setTeam = teamType === 'home' ? setHomeTeam : setAwayTeam;
    
    if (!team) return;

    const newPositions = { ...team.positions };
    newPositions[position as keyof typeof newPositions][slotIndex] = {
      position,
      playerId: null,
      adjustedOverall: null,
    };

    setTeam({ ...team, positions: newPositions });
  };

  const getAvailablePlayers = (team: TeamLineup) => {
    const assignedIds = new Set(
      Object.values(team.positions)
        .flat()
        .map(slot => slot.playerId)
        .filter(Boolean)
    );
    return team.players.filter(p => !assignedIds.has(p.id));
  };

  const isLineupComplete = (team: TeamLineup | null) => {
    if (!team) return false;
    return Object.entries(team.positions).every(([_, slots]) => 
      slots.every(slot => slot.playerId !== null)
    );
  };

  const simulateMatch = async () => {
    if (!homeTeam || !awayTeam || !matchId) return;

    if (!isLineupComplete(homeTeam)) {
      toast.error("Home team lineup is incomplete");
      return;
    }

    if (!isLineupComplete(awayTeam)) {
      toast.error("Away team lineup is incomplete");
      return;
    }

    setIsSimulating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Flatten all positions into lineup data
      const homeLineupData = Object.entries(homeTeam.positions)
        .flatMap(([pos, slots]) => slots.map((slot, idx) => ({
          match_id: matchId,
          team_id: homeTeam.teamId,
          player_id: slot.playerId!,
          user_id: user.id,
          is_starting: pos !== 'INT',
          position: pos
        })));

      const awayLineupData = Object.entries(awayTeam.positions)
        .flatMap(([pos, slots]) => slots.map((slot, idx) => ({
          match_id: matchId,
          team_id: awayTeam.teamId,
          player_id: slot.playerId!,
          user_id: user.id,
          is_starting: pos !== 'INT',
          position: pos
        })));

      const { error: lineupError } = await supabase
        .from("match_lineups")
        .insert([...homeLineupData, ...awayLineupData]);

      if (lineupError) throw lineupError;

      // Get all selected players with their adjusted overalls
      const homePlayersWithOveralls = Object.entries(homeTeam.positions)
        .flatMap(([pos, slots]) => slots.map(slot => {
          const player = homeTeam.players.find(p => p.id === slot.playerId);
          return player ? { ...player, adjustedOverall: slot.adjustedOverall || player.overall_rating, assignedPosition: pos } : null;
        }))
        .filter(Boolean);

      const awayPlayersWithOveralls = Object.entries(awayTeam.positions)
        .flatMap(([pos, slots]) => slots.map(slot => {
          const player = awayTeam.players.find(p => p.id === slot.playerId);
          return player ? { ...player, adjustedOverall: slot.adjustedOverall || player.overall_rating, assignedPosition: pos } : null;
        }))
        .filter(Boolean);

      // Count RUCs on each team for hitout distribution
      const homeRucs = homePlayersWithOveralls.filter(p => p.assignedPosition === "RUC");
      const awayRucs = awayPlayersWithOveralls.filter(p => p.assignedPosition === "RUC");

      const allStats = [
        ...homePlayersWithOveralls.map(p => generatePlayerStats(p, matchId, homeTeam.teamId, user.id, homeRucs, awayRucs)),
        ...awayPlayersWithOveralls.map(p => generatePlayerStats(p, matchId, awayTeam.teamId, user.id, homeRucs, awayRucs))
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
      const homeModifier = 0.85 + ((homeTeamData?.team_overall || 75) - 75) / 150;
      const awayModifier = 0.85 + ((awayTeamData?.team_overall || 75) - 75) / 150;
      
      // Random variance for score (0.80-1.20)
      const homeScoreVariance = 0.80 + Math.random() * 0.4;
      const awayScoreVariance = 0.80 + Math.random() * 0.4;

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

  const renderPositionSlots = (team: TeamLineup, teamType: 'home' | 'away', positionKey: string, count: number) => {
    const availablePlayers = getAvailablePlayers(team);
    const slots = team.positions[positionKey as keyof typeof team.positions];

    return (
      <div className="space-y-2">
        {slots.map((slot, idx) => {
          const player = slot.playerId ? team.players.find(p => p.id === slot.playerId) : null;
          const isOutOfPosition = player && player.favorite_position !== positionKey;

          return (
            <div key={idx} className="flex items-center gap-2">
              <Select
                value={slot.playerId || ""}
                onValueChange={(value) => value ? assignPlayer(teamType, positionKey, idx, value) : clearPosition(teamType, positionKey, idx)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select player">
                    {player && (
                      <span className={isOutOfPosition ? "text-orange-500" : ""}>
                        {player.name} ({player.favorite_position}) - {player.overall_rating} OVR
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.favorite_position}) - {p.overall_rating} OVR
                    </SelectItem>
                  ))}
                  {player && (
                    <SelectItem value={player.id}>
                      {player.name} ({player.favorite_position}) - {player.overall_rating} OVR
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {isOutOfPosition && (
                <Input
                  type="number"
                  min="60"
                  max="99"
                  value={slot.adjustedOverall || ''}
                  onChange={(e) => updateAdjustedOverall(teamType, positionKey, idx, e.target.value)}
                  className="w-20"
                  placeholder="OVR"
                />
              )}
              {slot.playerId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearPosition(teamType, positionKey, idx)}
                >
                  Clear
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

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
          <Button 
            onClick={simulateMatch} 
            disabled={isSimulating || !isLineupComplete(homeTeam) || !isLineupComplete(awayTeam)}
          >
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

        <div className="grid lg:grid-cols-2 gap-8">
          {homeTeam && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6">{homeTeam.teamName} (Home)</h2>
              
              {/* Field Layout */}
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-blue-600">KEY DEFENDERS (3)</h3>
                  {renderPositionSlots(homeTeam, 'home', 'KDEF', 3)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-blue-500">DEFENDERS (3)</h3>
                  {renderPositionSlots(homeTeam, 'home', 'DEF', 3)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-green-600">MIDFIELDERS (5)</h3>
                  {renderPositionSlots(homeTeam, 'home', 'MID', 5)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-purple-600">RUCK (1)</h3>
                  {renderPositionSlots(homeTeam, 'home', 'RUC', 1)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-orange-500">FORWARDS (3)</h3>
                  {renderPositionSlots(homeTeam, 'home', 'FWD', 3)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-orange-600">KEY FORWARDS (3)</h3>
                  {renderPositionSlots(homeTeam, 'home', 'KFWD', 3)}
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-gray-600">INTERCHANGE (3)</h3>
                  {renderPositionSlots(homeTeam, 'home', 'INT', 3)}
                </div>
              </div>
            </Card>
          )}

          {awayTeam && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6">{awayTeam.teamName} (Away)</h2>
              
              {/* Field Layout */}
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-blue-600">KEY DEFENDERS (3)</h3>
                  {renderPositionSlots(awayTeam, 'away', 'KDEF', 3)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-blue-500">DEFENDERS (3)</h3>
                  {renderPositionSlots(awayTeam, 'away', 'DEF', 3)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-green-600">MIDFIELDERS (5)</h3>
                  {renderPositionSlots(awayTeam, 'away', 'MID', 5)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-purple-600">RUCK (1)</h3>
                  {renderPositionSlots(awayTeam, 'away', 'RUC', 1)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-orange-500">FORWARDS (3)</h3>
                  {renderPositionSlots(awayTeam, 'away', 'FWD', 3)}
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2 text-orange-600">KEY FORWARDS (3)</h3>
                  {renderPositionSlots(awayTeam, 'away', 'KFWD', 3)}
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-gray-600">INTERCHANGE (3)</h3>
                  {renderPositionSlots(awayTeam, 'away', 'INT', 3)}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function generatePlayerStats(player: any, matchId: string, teamId: string, userId: string, homeRucs: any[], awayRucs: any[]) {
  const position = player.assignedPosition;
  const rating = player.adjustedOverall || player.overall_rating;
  
  // Form variance: 0.5-1.5 (wider range for unpredictable games)
  const form = 0.5 + Math.random();
  
  // Individual player variance (makes each game unique)
  const playerVariance = 0.7 + Math.random() * 0.6;
  
  let disposals = 0;
  let goals = 0;
  let behinds = 0;
  let tackles = 0;
  let marks = 0;
  let hitouts = 0;
  let intercepts = 0;

  // Helper to get base stat from rating buckets with variance
  const getBaseStat = (buckets: number[]) => {
    const idx = Math.min(Math.floor((rating - 60) / 5), 7);
    const base = buckets[idx] || buckets[0];
    const withinBucketBonus = (rating % 5) * 0.015;
    return base * (1 + withinBucketBonus);
  };

  switch (position) {
    case "MID":
      // Reduced disposals significantly - only top players hit 35+
      const midDisposals = [6, 8, 10.5, 13, 15.5, 18, 20.5, 23];
      const midMarks = [1, 1.3, 1.6, 1.9, 2.2, 2.5, 2.8, 3.2];
      const midTackles = [1.2, 1.8, 2.3, 2.8, 3.3, 3.8, 4.3, 4.8];
      const midIntercepts = [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7];
      
      disposals = Math.round(getBaseStat(midDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(midMarks) * form * playerVariance);
      tackles = Math.round(getBaseStat(midTackles) * form * playerVariance);
      intercepts = Math.round(getBaseStat(midIntercepts) * form * playerVariance * 0.6);
      goals = Math.random() < 0.10 ? Math.round(Math.random() * 2) : 0;
      behinds = goals > 0 && Math.random() < 0.35 ? Math.round(Math.random() * 2) : 0;
      break;

    case "HB":
    case "DEF":
      const hbDisposals = [6, 8, 10, 12, 14.5, 17, 19.5, 22];
      const hbMarks = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
      const hbTackles = [0.8, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3];
      const hbIntercepts = [0.8, 1.2, 1.6, 2, 2.4, 2.8, 3.2, 3.6];
      
      disposals = Math.round(getBaseStat(hbDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(hbMarks) * form * playerVariance);
      tackles = Math.round(getBaseStat(hbTackles) * form * playerVariance);
      intercepts = Math.round(getBaseStat(hbIntercepts) * form * playerVariance);
      goals = Math.random() < 0.02 ? 1 : 0;
      behinds = goals > 0 && Math.random() < 0.25 ? 1 : 0;
      break;

    case "FWD":
      const fwdDisposals = [4, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5];
      const fwdMarks = [0.8, 1.2, 1.5, 1.9, 2.3, 2.7, 3.1, 3.6];
      const fwdTackles = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
      const fwdGoals = [0.12, 0.28, 0.45, 0.65, 0.85, 1.05, 1.25, 1.5];
      
      disposals = Math.round(getBaseStat(fwdDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(fwdMarks) * form * playerVariance);
      tackles = Math.round(getBaseStat(fwdTackles) * form * playerVariance);
      // FWD can have big games (3-5 goals) but often 0-2, average ~1.8 over 10 games
      const fwdBaseGoals = getBaseStat(fwdGoals) * form * playerVariance;
      goals = Math.round(fwdBaseGoals + (Math.random() * 2 - 0.5));
      goals = Math.max(0, goals);
      behinds = Math.round(Math.random() * 2 + goals * 0.3);
      break;

    case "KFWD":
      const kfwdDisposals = [4, 5, 5.5, 6, 6.5, 7, 7.5, 8];
      const kfwdMarks = [1.2, 1.8, 2.3, 2.9, 3.5, 4.2, 5, 6];
      const kfwdTackles = [0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3, 1.5];
      const kfwdGoals = [0.3, 0.55, 0.85, 1.2, 1.6, 2, 2.4, 2.9];
      
      disposals = Math.round(getBaseStat(kfwdDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(kfwdMarks) * form * playerVariance);
      tackles = Math.round(getBaseStat(kfwdTackles) * form * playerVariance);
      // KFWD high variance: 0-1 goal bad games, 2-4 average, 5-9 good to career best
      // Average ~2.7 over 10 games, but can be outscored by FWDs in any given game
      const kfwdBaseGoals = getBaseStat(kfwdGoals);
      const goalVariance = form * playerVariance * (0.4 + Math.random() * 1.6);
      goals = Math.round(kfwdBaseGoals * goalVariance + (Math.random() * 2.5 - 0.7));
      goals = Math.max(0, Math.min(9, goals));
      behinds = Math.round(Math.random() * 3 + goals * 0.35);
      break;

    case "RUC":
      const rucDisposals = [4, 5, 6, 7, 8, 9, 10, 11];
      const rucMarks = [0.8, 1.2, 1.5, 1.9, 2.3, 2.7, 3.1, 3.6];
      
      const opposingRucs = homeRucs.some(r => r.id === player.id) ? awayRucs : homeRucs;
      
      if (opposingRucs.length > 0) {
        const opposingRating = opposingRucs[0].adjustedOverall || opposingRucs[0].overall_rating;
        const ratingDiff = rating - opposingRating;
        
        const baseHitouts = [10, 14, 18, 22, 26, 30, 35, 42];
        const myBase = getBaseStat(baseHitouts);
        
        hitouts = Math.round(myBase + (ratingDiff * 0.25) + (Math.random() * 6 - 3));
        hitouts = Math.max(6, Math.min(52, hitouts));
      } else {
        const soloHitouts = [10, 14, 18, 22, 26, 30, 35, 42];
        hitouts = Math.round(getBaseStat(soloHitouts) * 1.3 + Math.random() * 7);
        hitouts = Math.max(25, hitouts);
      }
      
      disposals = Math.round(getBaseStat(rucDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(rucMarks) * form * playerVariance);
      tackles = Math.round((0.8 + rating / 60) * form * playerVariance);
      goals = Math.random() < 0.06 ? 1 : 0;
      break;

    case "KDEF":
      const kdefDisposals = [5, 6, 7, 8, 9.5, 10.5, 11.5, 12.5];
      const kdefMarks = [2, 2.5, 3, 3.5, 4, 4.5, 5, 6];
      const kdefIntercepts = [0.9, 1.2, 1.5, 1.8, 2.2, 2.6, 3, 3.5];
      const kdefTackles = [0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.9, 2.2];
      
      disposals = Math.round(getBaseStat(kdefDisposals) * form * playerVariance);
      marks = Math.round(getBaseStat(kdefMarks) * form * playerVariance);
      intercepts = Math.round(getBaseStat(kdefIntercepts) * form * playerVariance);
      tackles = Math.round(getBaseStat(kdefTackles) * form * playerVariance);
      goals = Math.random() < 0.01 ? 1 : 0;
      behinds = goals > 0 && Math.random() < 0.2 ? 1 : 0;
      break;

    case "INT":
      // Interchange players based on their favorite position
      const intPlayer = { ...player, assignedPosition: player.favorite_position };
      return generatePlayerStats(intPlayer, matchId, teamId, userId, homeRucs, awayRucs);
  }

  // Fantasy: 2 disposal, 6 goal, 1 behind, 3 tackle, 3 mark, 4 intercept, 1 hitout
  const fantasyScore = 
    disposals * 2 + 
    goals * 6 + 
    behinds * 1 +
    tackles * 3 + 
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
