import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EditTeamDialogProps {
  team: {
    id: string;
    name: string;
    color: string;
    team_overall: number;
  };
  onUpdate: () => void;
}

export function EditTeamDialog({ team, onUpdate }: EditTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team.name);
  const [color, setColor] = useState(team.color);
  const [teamOverall, setTeamOverall] = useState(team.team_overall);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("teams")
        .update({ 
          name: name.trim(), 
          color, 
          team_overall: teamOverall 
        })
        .eq("id", team.id);

      if (error) throw error;

      setOpen(false);
      toast.success("Team updated successfully");
      onUpdate();
    } catch (error) {
      console.error("Error updating team:", error);
      toast.error("Failed to update team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Team Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-color">Team Color</Label>
            <div className="flex gap-2">
              <Input
                id="edit-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-overall">Team Overall (60-99)</Label>
            <Input
              id="edit-overall"
              type="number"
              min="60"
              max="99"
              value={teamOverall}
              onChange={(e) => setTeamOverall(Math.min(99, Math.max(60, parseInt(e.target.value) || 75)))}
              placeholder="75"
            />
            <p className="text-xs text-muted-foreground">
              Team overall affects final scores but not individual player stats
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Team"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
