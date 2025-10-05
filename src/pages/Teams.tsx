import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeamCard } from "@/components/TeamCard";
import { AddTeamDialog } from "@/components/AddTeamDialog";
import { CreateMatchDialog } from "@/components/CreateMatchDialog";
import { toast } from "sonner";
import { Loader2, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Team {
  id: string;
  name: string;
  color: string;
  playerCount?: number;
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view teams");
        return;
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });

      if (teamsError) throw teamsError;

      // Fetch player counts for each team
      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count } = await supabase
            .from("players")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);
          
          return {
            ...team,
            playerCount: count || 0,
          };
        })
      );

      setTeams(teamsWithCounts);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async (name: string, color: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("teams")
      .insert([{ name, color, user_id: user.id }]);

    if (error) throw error;
    await fetchTeams();
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team? All players will be removed.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Team deleted successfully");
      await fetchTeams();
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Failed to delete team");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-primary-foreground py-12 px-4">
        <div className="container mx-auto">
          <h1 className="text-5xl font-bold mb-2">AFL Match Simulator</h1>
          <p className="text-xl opacity-90">Manage your teams and players</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Teams</h2>
          <div className="flex gap-2">
            <CreateMatchDialog />
            <Button variant="outline" onClick={() => navigate("/leagues")} className="gap-2">
              <Trophy className="h-4 w-4" />
              Leagues
            </Button>
            <AddTeamDialog onAddTeam={handleAddTeam} />
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              No teams yet. Create your first team to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} onDelete={handleDeleteTeam} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}