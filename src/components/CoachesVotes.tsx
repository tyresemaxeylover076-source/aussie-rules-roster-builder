import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CoachesVote {
  id: string;
  player_id: string;
  votes: number;
  player?: {
    name: string;
    favorite_position: string;
  };
}

interface CoachesVotesProps {
  votes: CoachesVote[];
}

export function CoachesVotes({ votes }: CoachesVotesProps) {
  const sortedVotes = [...votes].sort((a, b) => b.votes - a.votes);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coaches Votes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedVotes.map((vote, index) => (
            <div key={vote.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-muted-foreground w-6">
                  {index + 1}.
                </span>
                <div>
                  <div className="font-medium">{vote.player?.name}</div>
                  <Badge variant="outline" className="mt-1">
                    {vote.player?.favorite_position}
                  </Badge>
                </div>
              </div>
              <div className="text-2xl font-bold">{vote.votes}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between font-semibold">
            <span>Total Votes</span>
            <span>{sortedVotes.reduce((sum, v) => sum + v.votes, 0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
