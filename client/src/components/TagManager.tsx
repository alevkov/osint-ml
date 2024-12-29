import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Tag as TagIcon, Loader2 } from 'lucide-react';
import type { Tag } from '@db/schema';

interface TagManagerProps {
  caseId: number;
  selectedTags: number[];
  onTagSelect: (tagIds: number[]) => void;
}

export default function TagManager({ caseId, selectedTags, onTagSelect }: TagManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#00ff00');

  const { data: tags, isLoading } = useQuery<Tag[]>({
    queryKey: [`/api/cases/${caseId}/tags`],
  });

  const createTag = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const res = await fetch(`/api/cases/${caseId}/tags`, {
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
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/tags`] });
      toast({ title: "Tag created successfully" });
      setIsCreatingTag(false);
      setNewTagName('');
    },
    onError: (error) => {
      toast({ 
        title: "Error creating tag", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: "Tag name required",
        description: "Please enter a name for the tag",
        variant: "destructive"
      });
      return;
    }

    createTag.mutate({ 
      name: newTagName.trim(),
      color: newTagColor
    });
  };

  const toggleTag = (tagId: number) => {
    const newSelection = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    onTagSelect(newSelection);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4" />
          <h3 className="font-semibold">Tags</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setIsCreatingTag(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-2">
          {tags?.map((tag) => (
            <Badge
              key={tag.id}
              variant={selectedTags.includes(tag.id) ? "default" : "outline"}
              className="cursor-pointer"
              style={{ 
                backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                borderColor: tag.color,
                color: selectedTags.includes(tag.id) ? '#000' : tag.color
              }}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={isCreatingTag} onOpenChange={setIsCreatingTag}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter tag name..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-24"
                />
                <Input 
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCreatingTag(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTag}
                disabled={createTag.isPending}
              >
                {createTag.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
