import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

interface NewCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewCaseDialog({ open, onOpenChange }: NewCaseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      title: "",
      description: ""
    }
  });

  const createCase = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      toast({ title: "Case created successfully" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error creating case", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = form.handleSubmit((data) => {
    createCase.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-primary/20 bg-background/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Create New Case
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Case Title"
              {...form.register("title", { required: true })}
            />
          </div>
          
          <div className="space-y-2">
            <Textarea
              placeholder="Case Description (optional)"
              {...form.register("description")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCase.isPending}>
              Create Case
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
