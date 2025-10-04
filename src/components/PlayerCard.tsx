import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    favorite_position: string;
    overall_rating: number;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const positionColors = {
  FWD: "bg-secondary",
  KFWD: "bg-orange-600",
  MID: "bg-primary",
  DEF: "bg-accent",
  KDEF: "bg-blue-600",
  RUC: "bg-purple-600",
};

const getRatingColor = (rating: number) => {
  if (rating >= 90) return "text-yellow-600 font-bold";
  if (rating >= 80) return "text-green-600 font-semibold";
  if (rating >= 70) return "text-blue-600";
  return "text-muted-foreground";
};

export function PlayerCard({ player, onEdit, onDelete, compact = false }: PlayerCardProps) {
  return (
    <Card className="card-glow">
      <CardHeader className={compact ? "pb-2" : ""}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={compact ? "text-base" : "text-lg"}>{player.name}</span>
            <Badge className={positionColors[player.favorite_position as keyof typeof positionColors]}>
              {player.favorite_position}
            </Badge>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(player.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(player.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Overall Rating</span>
          <span className={`text-2xl ${getRatingColor(player.overall_rating)}`}>
            {player.overall_rating}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}