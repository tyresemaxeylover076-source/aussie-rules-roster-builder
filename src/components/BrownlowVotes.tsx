import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BrownlowVote {
  id: string;
  player_id: string;
  votes: number;
  format: "3-2-1" | "5-4-3-2-1";
  player?: {
    name: string;
    favorite_position: string;
  };
}

interface BrownlowVotesProps {
  votes: BrownlowVote[];
  format: "3-2-1" | "5-4-3-2-1";
}

const getMedalColor = (votes: number, format: "3-2-1" | "5-4-3-2-1") => {
  if (format === "3-2-1") {
    if (votes === 3) return "text-yellow-600";
    if (votes === 2) return "text-gray-400";
    if (votes === 1) return "text-amber-700";
  } else {
    if (votes === 5) return "text-yellow-600";
    if (votes === 4) return "text-gray-400";
    if (votes === 3) return "text-amber-700";
    if (votes === 2) return "text-blue-600";
    if (votes === 1) return "text-green-600";
  }
  return "";
};

export function BrownlowVotes({ votes, format }: BrownlowVotesProps) {
  const sortedVotes = [...votes].sort((a, b) => b.votes - a.votes);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Brownlow Votes</span>
          <Badge variant="secondary">{format} Format</Badge>
        </CardTitle>
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
              <div className={`text-3xl font-bold ${getMedalColor(vote.votes, format)}`}>
                {vote.votes}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
