import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CoachesVotes } from "@/components/CoachesVotes";
import { BrownlowVotes } from "@/components/BrownlowVotes";
import { GenerateVotesDialog } from "@/components/GenerateVotesDialog";
import { ArrowLeft } from "lucide-react";

export default function MatchVotes() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [coachesVotes, setCoachesVotes] = useState<any[]>([]);
  const [brownlowVotes, setBrownlowVotes] = useState<any[]>([]);
  const [brownlowFormat, setBrownlowFormat] = useState<"3-2-1" | "5-4-3-2-1">("3-2-1");
  const [isLoading, setIsLoading] = useState(true);

  const loadVotes = async () => {
    if (!matchId) return;

    setIsLoading(true);
    try {
      // Load coaches votes
      const { data: coachesData } = await supabase
        .from("coaches_votes")
        .select("*, players!inner(name, favorite_position)")
        .eq("match_id", matchId);

      // Load brownlow votes
      const { data: brownlowData } = await supabase
        .from("brownlow_votes")
        .select("*, players!inner(name, favorite_position)")
        .eq("match_id", matchId);

      // Transform data to match component expectations (players -> player)
      const transformedCoaches = coachesData?.map((vote: any) => ({
        ...vote,
        player: vote.players
      })) || [];

      const transformedBrownlow = brownlowData?.map((vote: any) => ({
        ...vote,
        player: vote.players
      })) || [];

      setCoachesVotes(transformedCoaches);
      setBrownlowVotes(transformedBrownlow);
      
      if (brownlowData && brownlowData.length > 0) {
        setBrownlowFormat(brownlowData[0].format as "3-2-1" | "5-4-3-2-1");
      }
    } catch (error) {
      console.error("Error loading votes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVotes();
  }, [matchId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-lg">Loading votes...</div>
      </div>
    );
  }

  const hasVotes = coachesVotes.length > 0 || brownlowVotes.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold">Match Votes</h1>
          </div>
          <GenerateVotesDialog matchId={matchId!} onVotesGenerated={loadVotes} />
        </div>

        {!hasVotes ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No votes generated yet. Generate match stats first, then create votes.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {coachesVotes.length > 0 && <CoachesVotes votes={coachesVotes} />}
            {brownlowVotes.length > 0 && (
              <BrownlowVotes votes={brownlowVotes} format={brownlowFormat} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
