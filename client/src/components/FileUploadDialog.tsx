import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: number;
}

export default function FileUploadDialog({ open, onOpenChange, caseId }: FileUploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/cases/${caseId}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/graph`] });
      toast({ title: "File processed successfully" });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error processing file", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile.mutate(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-primary/20 bg-background/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Upload Case File
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-primary/20 border-dashed rounded-lg cursor-pointer bg-background/50 hover:bg-primary/5 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                {uploadFile.isPending ? (
                  <>
                    <Loader2 className="h-8 w-8 mb-4 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Processing file...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mb-4 text-primary" />
                    <p className="mb-2 text-sm text-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      TXT files only
                    </p>
                  </>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".txt"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploadFile.isPending}
              />
            </label>
          </div>

          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              type="button"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
