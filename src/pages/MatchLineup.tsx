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

      // Call the existing simulation function from CreateMatchDialog
      const { default: CreateMatchDialog } = await import("@/components/CreateMatchDialog");
      
      toast.success("Simulating match...");
      
      // Navigate to results page
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
