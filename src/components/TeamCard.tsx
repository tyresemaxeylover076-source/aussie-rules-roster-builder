import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EditTeamDialog } from "./EditTeamDialog";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    color: string;
    team_overall: number;
    playerCount?: number;
  };
  onDelete: (id: string) => void;
  onUpdate: () => void;
}

export function TeamCard({ team, onDelete, onUpdate }: TeamCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="card-glow overflow-hidden cursor-pointer" onClick={() => navigate(`/teams/${team.id}`)}>
      <div 
        className="h-2 w-full" 
        style={{ backgroundColor: team.color }}
      />
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl">{team.name}</span>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <EditTeamDialog team={team} onUpdate={onUpdate} />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onDelete(team.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{team.playerCount || 0} players</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="font-semibold">Overall:</span>
            <span>{team.team_overall || 75}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}