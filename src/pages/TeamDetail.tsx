import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PlayerCard } from "@/components/PlayerCard";
import { AddPlayerDialog } from "@/components/AddPlayerDialog";
import { BulkImportPlayersDialog } from "@/components/BulkImportPlayersDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Player {
  id: string;
  name: string;
  favorite_position: string;
  overall_rating: number;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamAndPlayers();
  }, [teamId]);

  const fetchTeamAndPlayers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        navigate("/");
        return;
      }

      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .order("overall_rating", { ascending: false });

      if (playersError) throw playersError;
      setPlayers(playersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (name: string, position: string, rating: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("players")
      .insert([{ 
        name, 
        favorite_position: position, 
        overall_rating: rating,
        team_id: teamId,
        user_id: user.id 
      }]);

    if (error) throw error;
    await fetchTeamAndPlayers();
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this player?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("players")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Player deleted successfully");
      await fetchTeamAndPlayers();
    } catch (error) {
      console.error("Error deleting player:", error);
      toast.error("Failed to delete player");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Team not found</p>
      </div>
    );
  }

  const hasMinimumPlayers = players.length >= 22;

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="text-primary-foreground py-12 px-4"
        style={{ background: `linear-gradient(135deg, ${team.color}, ${team.color}dd)` }}
      >
        <div className="container mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")} 
            className="mb-4 text-primary-foreground hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
          <h1 className="text-5xl font-bold mb-2">{team.name}</h1>
          <p className="text-xl opacity-90">{players.length} players on roster</p>
          {!hasMinimumPlayers && (
            <p className="text-yellow-300 mt-2">⚠️ Need at least 22 players (currently {players.length})</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Roster</h2>
          <div className="flex gap-2">
            <BulkImportPlayersDialog teamId={teamId!} onImportComplete={fetchTeamAndPlayers} />
            <AddPlayerDialog onAddPlayer={handleAddPlayer} />
          </div>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              No players yet. Add your first player to build your roster!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                onDelete={handleDeletePlayer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}