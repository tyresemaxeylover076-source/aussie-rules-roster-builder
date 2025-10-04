import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

const leagueFormSchema = z.object({
  name: z.string().min(1, "League name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  is_active: z.boolean().default(false),
});

type LeagueFormValues = z.infer<typeof leagueFormSchema>;

interface AddLeagueDialogProps {
  onLeagueAdded: () => void;
}

export function AddLeagueDialog({ onLeagueAdded }: AddLeagueDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueFormSchema),
    defaultValues: {
      name: "",
      description: "",
      is_active: false,
    },
  });

  const onSubmit = async (values: LeagueFormValues) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("leagues").insert({
        name: values.name,
        description: values.description || null,
        is_active: values.is_active,
        user_id: user.id,
        league_data: {},
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "League created successfully",
      });

      form.reset();
      setOpen(false);
      onLeagueAdded();
    } catch (error) {
      console.error("Error creating league:", error);
      toast({
        title: "Error",
        description: "Failed to create league. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add League
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New League</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>League Name</FormLabel>
                  <FormControl>
                    <Input placeholder="AFL Premier League" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter league description..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Set as Active League</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Create League
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
