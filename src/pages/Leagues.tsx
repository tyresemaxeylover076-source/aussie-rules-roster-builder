import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LeagueCard } from "@/components/LeagueCard";
import { AddLeagueDialog } from "@/components/AddLeagueDialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Leagues() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadLeagues = async () => {
    try {
      const { data, error } = await supabase
        .from("leagues")
        .select("*")
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeagues(data || []);
    } catch (error) {
      console.error("Error loading leagues:", error);
      toast({
        title: "Error",
        description: "Failed to load leagues",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeagues();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this league?")) return;

    try {
      const { error } = await supabase.from("leagues").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "League deleted successfully",
      });

      loadLeagues();
    } catch (error) {
      console.error("Error deleting league:", error);
      toast({
        title: "Error",
        description: "Failed to delete league",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-lg">Loading leagues...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold">Leagues</h1>
          </div>
          <AddLeagueDialog onLeagueAdded={loadLeagues} />
        </div>

        {leagues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No leagues yet. Create your first league to get started!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
