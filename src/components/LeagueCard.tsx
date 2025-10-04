import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Trophy } from "lucide-react";

interface LeagueCardProps {
  league: {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function LeagueCard({ league, onEdit, onDelete }: LeagueCardProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary" />
            <span>{league.name}</span>
            {league.is_active && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                Active
              </span>
            )}
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(league.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(league.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      {league.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{league.description}</p>
        </CardContent>
      )}
    </Card>
  );
}
