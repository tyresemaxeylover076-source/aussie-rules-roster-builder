import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddPlayerDialogProps {
  onAddPlayer: (name: string, position: string, rating: number) => Promise<void>;
  triggerButton?: React.ReactNode;
}

const positions = ["FWD", "MID", "DEF", "RUC"];

export function AddPlayerDialog({ onAddPlayer, triggerButton }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("MID");
  const [rating, setRating] = useState("75");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a player name");
      return;
    }

    const ratingNum = parseInt(rating);
    if (ratingNum < 60 || ratingNum > 99) {
      toast.error("Rating must be between 60 and 99");
      return;
    }

    setLoading(true);
    try {
      await onAddPlayer(name.trim(), position, ratingNum);
      setName("");
      setPosition("MID");
      setRating("75");
      setOpen(false);
      toast.success("Player added successfully");
    } catch (error) {
      toast.error("Failed to add player");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Add Player
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playerName">Player Name</Label>
            <Input
              id="playerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter player name"
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Favourite Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger id="position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rating">Overall Rating (60-99)</Label>
            <Input
              id="rating"
              type="number"
              min="60"
              max="99"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Player"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}