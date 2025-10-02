import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    color: string;
    playerCount?: number;
  };
  onDelete: (id: string) => void;
}

export function TeamCard({ team, onDelete }: TeamCardProps) {
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
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(`/teams/${team.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{team.playerCount || 0} players</span>
        </div>
      </CardContent>
    </Card>
  );
}