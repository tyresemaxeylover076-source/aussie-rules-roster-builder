import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trophy } from "lucide-react";
import { BrownlowVotes } from "@/components/BrownlowVotes";

interface MatchData {
  id: string;
  home_score: number;
  away_score: number;
  home_team: { name: string; color: string };
  away_team: { name: string; color: string };
}

interface PlayerStat {
  player_id: string;
  team_id: string;
  disposals: number;
  goals: number;
  tackles: number;
  marks: number;
  intercepts: number;
  hitouts: number;
  fantasy_score: number;
  impact_score: number;
  players: {
    name: string;
    favorite_position: string;
  };
}

interface BrownlowVote {
  id: string;
  player_id: string;
  votes: number;
  format: "3-2-1" | "5-4-3-2-1";
  players: {
    name: string;
    favorite_position: string;
  };
}

export default function MatchResults() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [homeStats, setHomeStats] = useState<PlayerStat[]>([]);
  const [awayStats, setAwayStats] = useState<PlayerStat[]>([]);
  const [brownlowVotes, setBrownlowVotes] = useState<BrownlowVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMatchResults();
  }, [matchId]);

  const loadMatchResults = async () => {
    if (!matchId) return;

    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*, home_team:teams!home_team_id(name, color), away_team:teams!away_team_id(name, color)")
        .eq("id", matchId)
        .single();

      if (matchError) throw matchError;

      const { data: statsData, error: statsError } = await supabase
        .from("match_stats")
        .select("*, players(name, favorite_position)")
        .eq("match_id", matchId)
        .order("fantasy_score", { ascending: false });

      if (statsError) throw statsError;

      const { data: votesData, error: votesError } = await supabase
        .from("brownlow_votes")
        .select("*, players(name, favorite_position)")
        .eq("match_id", matchId)
        .order("votes", { ascending: false });

      if (votesError) throw votesError;

      setMatch(matchData as any);
      setHomeStats((statsData as any[]).filter(s => s.team_id === matchData.home_team_id));
      setAwayStats((statsData as any[]).filter(s => s.team_id === matchData.away_team_id));
      setBrownlowVotes((votesData as any[]) || []);
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-lg">Loading results...</div>
      </div>
    );
  }

  const StatsTable = ({ stats, teamName }: { stats: PlayerStat[]; teamName: string }) => (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">{teamName}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="text-center">Pos</TableHead>
            <TableHead className="text-center">D</TableHead>
            <TableHead className="text-center">G</TableHead>
            <TableHead className="text-center">T</TableHead>
            <TableHead className="text-center">M</TableHead>
            <TableHead className="text-center">I</TableHead>
            <TableHead className="text-center">H</TableHead>
            <TableHead className="text-center">Fantasy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat) => (
            <TableRow key={stat.player_id}>
              <TableCell className="font-medium">{(stat.players as any).name}</TableCell>
              <TableCell className="text-center text-xs">{(stat.players as any).favorite_position}</TableCell>
              <TableCell className="text-center">{stat.disposals}</TableCell>
              <TableCell className="text-center font-bold">{stat.goals}</TableCell>
              <TableCell className="text-center">{stat.tackles}</TableCell>
              <TableCell className="text-center">{stat.marks}</TableCell>
              <TableCell className="text-center">{stat.intercepts}</TableCell>
              <TableCell className="text-center">{stat.hitouts}</TableCell>
              <TableCell className="text-center font-bold">{stat.fantasy_score}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const winner = match.home_score > match.away_score ? match.home_team.name : 
                 match.away_score > match.home_score ? match.away_team.name : 
                 "Draw";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl font-bold">Match Results</h1>
          </div>
          <Button onClick={() => navigate(`/match/${matchId}/votes`)}>
            View Votes
          </Button>
        </div>

        {/* Final Score */}
        <Card className="p-8 mb-8 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="text-center mb-6">
            {winner !== "Draw" && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <span className="text-xl font-bold">{winner} wins!</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">{match.home_team.name}</h2>
              <div className="text-5xl font-bold">{match.home_score}</div>
            </div>
            <div className="text-center text-2xl font-bold text-muted-foreground">vs</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">{match.away_team.name}</h2>
              <div className="text-5xl font-bold">{match.away_score}</div>
            </div>
          </div>
        </Card>

        {/* Brownlow Votes */}
        {brownlowVotes.length > 0 && (
          <div className="mb-8">
            <BrownlowVotes votes={brownlowVotes as any} format="3-2-1" />
          </div>
        )}

        {/* Stats Tables */}
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground mb-2">
            Fantasy Scoring: Disposals (2), Goals (6), Tackles (4), Marks (3), Intercepts (4), Hitouts (1)
          </div>
          <StatsTable stats={homeStats} teamName={match.home_team.name} />
          <StatsTable stats={awayStats} teamName={match.away_team.name} />
        </div>
      </div>
    </div>
  );
}
