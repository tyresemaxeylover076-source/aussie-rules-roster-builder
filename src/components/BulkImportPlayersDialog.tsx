import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface BulkImportPlayersDialogProps {
  teamId: string;
  onImportComplete: () => void;
}

const POSITIONS = ["FWD", "KFWD", "MID", "DEF", "KDEF", "RUC"] as const;

export function BulkImportPlayersDialog({ teamId, onImportComplete }: BulkImportPlayersDialogProps) {
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast({
        title: "Error",
        description: "Please enter player data",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const lines = csvData.trim().split("\n");
      const players = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(",").map(p => p.trim());
        if (parts.length !== 3) {
          toast({
            title: "Format Error",
            description: `Line ${i + 1}: Expected format "Name, Position, Rating"`,
            variant: "destructive",
          });
          setIsImporting(false);
          return;
        }

        const [name, position, ratingStr] = parts;
        const rating = parseInt(ratingStr);

        if (!name || !position || isNaN(rating)) {
          toast({
            title: "Format Error",
            description: `Line ${i + 1}: Invalid data`,
            variant: "destructive",
          });
          setIsImporting(false);
          return;
        }

        if (!POSITIONS.includes(position as any)) {
          toast({
            title: "Invalid Position",
            description: `Line ${i + 1}: Position must be one of: ${POSITIONS.join(", ")}`,
            variant: "destructive",
          });
          setIsImporting(false);
          return;
        }

        if (rating < 60 || rating > 99) {
          toast({
            title: "Invalid Rating",
            description: `Line ${i + 1}: Rating must be between 60 and 99`,
            variant: "destructive",
          });
          setIsImporting(false);
          return;
        }

        players.push({
          name,
          favorite_position: position,
          overall_rating: rating,
          team_id: teamId,
          user_id: user.id,
        });
      }

      const { error } = await supabase.from("players").insert(players);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${players.length} player(s)`,
      });

      setCsvData("");
      setOpen(false);
      onImportComplete();
    } catch (error) {
      console.error("Error importing players:", error);
      toast({
        title: "Error",
        description: "Failed to import players. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Players</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csv-data">Player Data (CSV Format)</Label>
            <Textarea
              id="csv-data"
              placeholder="John Smith, KFWD, 85&#10;Jane Doe, MID, 90&#10;Bob Wilson, KDEF, 78"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Format:</strong> Name, Position, Rating (one per line)</p>
            <p><strong>Positions:</strong> FWD, KFWD, MID, DEF, KDEF, RUC</p>
            <p><strong>Rating:</strong> 60-99</p>
            <p className="text-xs mt-2">
              <strong>Position Guide:</strong><br />
              • <strong>KFWD</strong> (Key Forward): Kick more goals than FWD, more than MID/DEF<br />
              • <strong>KDEF</strong> (Key Defender): Smaller defender, high-rated can get many touches
            </p>
          </div>
        </div>
        <Button onClick={handleImport} disabled={isImporting} className="w-full">
          {isImporting ? "Importing..." : "Import Players"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
