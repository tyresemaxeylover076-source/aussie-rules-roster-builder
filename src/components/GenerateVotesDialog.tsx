import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Award } from "lucide-react";

interface GenerateVotesDialogProps {
  matchId: string;
  onVotesGenerated: () => void;
}

export function GenerateVotesDialog({ matchId, onVotesGenerated }: GenerateVotesDialogProps) {
  const [open, setOpen] = useState(false);
  const [brownlowFormat, setBrownlowFormat] = useState<"3-2-1" | "5-4-3-2-1">("3-2-1");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateVotes = async () => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get match stats
      const { data: stats, error: statsError } = await supabase
        .from("match_stats")
        .select("*, players!inner(name, favorite_position)")
        .eq("match_id", matchId)
        .order("impact_score", { ascending: false });

      if (statsError) throw statsError;
      if (!stats || stats.length === 0) {
        toast({
          title: "No Stats Available",
          description: "Generate match stats before creating votes.",
          variant: "destructive",
        });
        return;
      }

      // Generate Coaches Votes (30 total among 5-10 players)
      const coachesVotesData = generateCoachesVotes(stats);
      
      // Delete existing coaches votes
      await supabase.from("coaches_votes").delete().eq("match_id", matchId);
      
      const { error: coachesError } = await supabase
        .from("coaches_votes")
        .insert(coachesVotesData.map(v => ({
          match_id: matchId,
          player_id: v.player_id,
          team_id: v.team_id,
          user_id: user.id,
          votes: v.votes,
        })));

      if (coachesError) throw coachesError;

      // Generate Brownlow Votes
      const brownlowVotesData = generateBrownlowVotes(stats, brownlowFormat);
      
      // Delete existing brownlow votes
      await supabase.from("brownlow_votes").delete().eq("match_id", matchId);
      
      const { error: brownlowError } = await supabase
        .from("brownlow_votes")
        .insert(brownlowVotesData.map(v => ({
          match_id: matchId,
          player_id: v.player_id,
          team_id: v.team_id,
          user_id: user.id,
          votes: v.votes,
          format: brownlowFormat,
        })));

      if (brownlowError) throw brownlowError;

      toast({
        title: "Votes Generated",
        description: "Coaches and Brownlow votes have been created successfully.",
      });

      setOpen(false);
      onVotesGenerated();
    } catch (error) {
      console.error("Error generating votes:", error);
      toast({
        title: "Error",
        description: "Failed to generate votes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Award className="h-4 w-4" />
          Generate Votes
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Post-Match Votes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Brownlow Votes Format</Label>
            <RadioGroup value={brownlowFormat} onValueChange={(v) => setBrownlowFormat(v as "3-2-1" | "5-4-3-2-1")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3-2-1" id="traditional" />
                <Label htmlFor="traditional" className="font-normal">
                  Traditional (3, 2, 1)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5-4-3-2-1" id="extended" />
                <Label htmlFor="extended" className="font-normal">
                  Extended (5, 4, 3, 2, 1)
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Coaches Votes:</strong> 30 votes distributed among 5-10 top performers</p>
            <p><strong>Brownlow Votes:</strong> Top {brownlowFormat === "3-2-1" ? "3" : "5"} players based on performance</p>
          </div>
        </div>
        <Button onClick={generateVotes} disabled={isGenerating} className="w-full">
          {isGenerating ? "Generating..." : "Generate Votes"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function generateCoachesVotes(stats: any[]) {
  // Distribute 30 votes among 5-10 players
  const numPlayers = Math.min(Math.max(5, Math.floor(stats.length / 3)), 10);
  const topPlayers = stats.slice(0, numPlayers);
  
  const votesDistribution = [10, 8, 7, 3, 2, 2, 2, 1, 1, 1];
  
  return topPlayers.map((stat, index) => ({
    player_id: stat.player_id,
    team_id: stat.team_id,
    votes: votesDistribution[index] || 1,
  }));
}

function generateBrownlowVotes(stats: any[], format: "3-2-1" | "5-4-3-2-1") {
  const numPlayers = format === "3-2-1" ? 3 : 5;
  const topPlayers = stats.slice(0, numPlayers);
  
  const votesDistribution = format === "3-2-1" ? [3, 2, 1] : [5, 4, 3, 2, 1];
  
  return topPlayers.map((stat, index) => ({
    player_id: stat.player_id,
    team_id: stat.team_id,
    votes: votesDistribution[index],
  }));
}
