import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Search, Plus, Loader2 } from "lucide-react";

interface NodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: number;
}

interface SearchResult {
  type: string;
  content: string;
  metadata: {
    source: string;
    field: string;
    value: string;
    database: string;
    original: any;
    service?: string; 
    exists?: boolean; 
    emailrecovery?: string; 
    phoneNumber?: string; 
  };
}

const SNUSBASE_TYPES = [
  "email",
  "username",
  "lastip",
  "password",
  "hash",
  "name",
  "_domain",
] as const;

type SnusbaseType = (typeof SNUSBASE_TYPES)[number];

export default function NodeDialog({
  open,
  onOpenChange,
  caseId,
}: NodeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [snusbaseResults, setSnusbaseResults] = useState<SearchResult[]>([]);
  const [dehashedResults, setDehashedResults] = useState<SearchResult[]>([]);
  const [holeheResults, setHoleheResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingNodes, setAddingNodes] = useState<Set<string>>(new Set());
  const [addingAllNodes, setAddingAllNodes] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<SnusbaseType[]>(["email"]);
  const [useWildcard, setUseWildcard] = useState(false);
  const [resultsPerPage, setResultsPerPage] = useState(100);

  const form = useForm({
    defaultValues: {
      type: "text",
      content: "",
      searchTerms: "",
      dehashedQuery: "",
      emailSearch: "",
    },
  });

  // Reset all states when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setSnusbaseResults([]);
      setDehashedResults([]);
      setHoleheResults([]);
      setIsSearching(false);
      setAddingNodes(new Set());
      setAddingAllNodes(new Set());
      setSelectedTypes(["email"]);
      setUseWildcard(false);
      setResultsPerPage(100);
    }
  }, [open, form]);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      form.reset();
      setSnusbaseResults([]);
      setDehashedResults([]);
      setHoleheResults([]);
      setIsSearching(false);
      setAddingNodes(new Set());
      setAddingAllNodes(new Set());
    };
  }, [form]);

  const createNode = useMutation({
    mutationFn: async (data: {
      type: string;
      content: string;
      tagIds?: number[];
    }) => {
      const res = await fetch(`/api/cases/${caseId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/cases/${caseId}/graph`],
      });
      toast({ title: "Node created successfully" });
      form.reset();
      setSnusbaseResults([]);
      setDehashedResults([]);
      setHoleheResults([]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating node",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const searchSnusbase = async () => {
    const { searchTerms } = form.getValues();

    if (!searchTerms) {
      toast({
        title: "Search terms required",
        description: "Please enter at least one search term",
        variant: "destructive",
      });
      return;
    }

    if (selectedTypes.length === 0) {
      toast({
        title: "Search type required",
        description: "Please select at least one search type",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSnusbaseResults([]);

    try {
      const res = await fetch("/api/search/snusbase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms: searchTerms.split(",").map((t) => t.trim()),
          types: selectedTypes,
          wildcard: useWildcard,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setSnusbaseResults(data.results);

      if (data.results.length === 0) {
        toast({
          title: "No results found",
          description: `Search completed in ${data.took}ms`,
        });
      } else {
        toast({
          title: `Found ${data.size} results`,
          description: `Search completed in ${data.took}ms`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const searchDehashed = async () => {
    const { dehashedQuery } = form.getValues();
    setIsSearching(true);
    setDehashedResults([]);

    try {
      const res = await fetch("/api/search/dehashed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: dehashedQuery, limit: resultsPerPage }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Dehashed API request failed");
      }

      const data = await res.json();
      setDehashedResults(data.results);

      if (data.results.length === 0) {
        toast({ title: "No results found" });
      } else {
        toast({
          title: `Found ${data.total} results`,
          description: `Search completed in ${data.took}ms. Balance: ${data.balance}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Dehashed search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const searchHolehe = async () => {
    const { emailSearch } = form.getValues();

    if (!emailSearch) {
      toast({
        title: "Email required",
        description: "Please enter an email address to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHoleheResults([]);

    try {
      const res = await fetch("/api/search/holehe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailSearch }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setHoleheResults(data.results);

      if (data.results.length === 0) {
        toast({ title: "No results found" });
      } else {
        toast({
          title: `Found ${data.results.length} services`,
          description: "Search completed successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultSelect = async (
    results: SearchResult[],
    groupId?: string,
  ) => {
    if (groupId) {
      setAddingAllNodes((prev) => new Set([...prev, groupId]));
    }

    for (const result of results) {
      const resultId = groupId
        ? `${groupId}-${result.metadata.service}-${results.indexOf(result)}`
        : `${result.metadata.database}-${result.metadata.field}-${result.metadata.value}`;
      setAddingNodes((prev) => new Set([...prev, resultId]));

      try {
        await createNode.mutateAsync({
          type: "text",
          content: result.content,
        });
      } finally {
        setAddingNodes((prev) => {
          const next = new Set(prev);
          next.delete(resultId);
          return next;
        });
      }
    }

    if (groupId) {
      setAddingAllNodes((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  };

  const groupResults = (results: SearchResult[]) => {
    return results.reduce(
      (acc: { [key: string]: SearchResult[] }, result) => {
        const database = result.metadata.database || result.metadata.service; 
        if (!acc[database]) {
          acc[database] = [];
        }
        acc[database].push(result);
        return acc;
      },
      {},
    );
  };

  const groupedSnusbaseResults = groupResults(snusbaseResults);
  const groupedDehashedResults = groupResults(dehashedResults);
  const groupedHoleheResults = groupResults(holeheResults);

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          form.reset();
          setSnusbaseResults([]);
          setDehashedResults([]);
          setHoleheResults([]);
          setIsSearching(false);
          setAddingNodes(new Set());
          setAddingAllNodes(new Set());
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Add Node
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="dehashed">Dehashed Search</TabsTrigger>
            <TabsTrigger value="snusbase">Snusbase Search</TabsTrigger>
            <TabsTrigger value="holehe">Holehe Email</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="flex-1 mt-4 overflow-auto">
            <form
              onSubmit={form.handleSubmit((data) => createNode.mutate(data))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Node Type</Label>
                <RadioGroup
                  defaultValue="text"
                  className="flex gap-4"
                  {...form.register("type")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="text" />
                    <Label htmlFor="text">Text</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="link" id="link" />
                    <Label htmlFor="link">Link</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <Input
                  placeholder={
                    form.watch("type") === "text"
                      ? "Enter text..."
                      : "Enter URL..."
                  }
                  {...form.register("content", { required: true })}
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
                <Button type="submit" disabled={createNode.isPending}>
                  {createNode.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Node"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="snusbase" className="flex-1 mt-4 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="space-y-4 flex-shrink-0">
                <div className="space-y-2">
                  <Label>Search Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {SNUSBASE_TYPES.map((type) => (
                      <Button
                        key={type}
                        variant={
                          selectedTypes.includes(type) ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setSelectedTypes((prev) =>
                            prev.includes(type)
                              ? prev.filter((t) => t !== type)
                              : [...prev, type],
                          );
                        }}
                      >
                        {type.charAt(0).toUpperCase() +
                          type.slice(1).replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Search Terms (comma-separated)</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={useWildcard}
                        onCheckedChange={setUseWildcard}
                      />
                      <Label>Use Wildcards</Label>
                    </div>
                  </div>
                  <Input
                    placeholder="Enter search terms..."
                    {...form.register("searchTerms")}
                  />
                  {useWildcard && (
                    <p className="text-xs text-muted-foreground">
                      Use % for any number of characters, _ for a single character
                    </p>
                  )}
                </div>

                <Button
                  onClick={searchSnusbase}
                  disabled={isSearching}
                  className="w-full"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {snusbaseResults.length > 0 && (
                <div className="flex-1 min-h-0 mt-4">
                  <ScrollArea className="h-full rounded-md border">
                    <div className="p-4 space-y-6">
                      {Object.entries(groupedSnusbaseResults).map(([database, results]) => (
                        <div key={database} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-primary">
                              Database: {database}
                            </h3>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={addingAllNodes.has(database)}
                              onClick={() => handleResultSelect(results, database)}
                            >
                              {addingAllNodes.has(database) ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Adding All...
                                </>
                              ) : (
                                "Add All Results"
                              )}
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {results.map((result) => {
                              const resultId = `${result.metadata.database}-${result.metadata.field}-${result.metadata.value}`;
                              const isAdding = addingNodes.has(resultId);

                              return (
                                <div
                                  key={resultId}
                                  className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-mono">
                                      <span className="font-semibold text-primary">
                                        {result.metadata.field}:
                                      </span>{" "}
                                      {result.metadata.value}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={isAdding}
                                    onClick={() => handleResultSelect([result])}
                                  >
                                    {isAdding ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Plus className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dehashed" className="flex-1 mt-4 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="space-y-4 flex-shrink-0">
                <div className="space-y-2">
                  <Label>Search Query</Label>
                  <Input
                    placeholder="Enter search query (e.g. email:test@example.com)"
                    {...form.register("dehashedQuery")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use field names like: email, ip_address, username, password,
                    hashed_password, hash_type, name, vin, address, phone
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Example: email:example.com OR username:john
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Results Per Page</Label>
                    <Select
                      value={resultsPerPage.toString()}
                      onValueChange={(value) => setResultsPerPage(Number(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="100" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 Results</SelectItem>
                        <SelectItem value="1000">1,000 Results</SelectItem>
                        <SelectItem value="10000">10,000 Results</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={searchDehashed}
                  disabled={isSearching}
                  className="w-full"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {dehashedResults.length > 0 && (
                <div className="flex-1 min-h-0 mt-4">
                  <ScrollArea className="h-full rounded-md border">
                    <div className="p-4 space-y-6">
                      {Object.entries(groupedDehashedResults).map(([database, results]) => (
                        <div key={database} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-primary">
                              Database: {database}
                            </h3>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={addingAllNodes.has(database)}
                              onClick={() => handleResultSelect(results, database)}
                            >
                              {addingAllNodes.has(database) ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Adding All...
                                </>
                              ) : (
                                "Add All Results"
                              )}
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {results.map((result) => {
                              const resultId = `${result.metadata.database}-${result.metadata.field}-${result.metadata.value}`;
                              const isAdding = addingNodes.has(resultId);

                              return (
                                <div
                                  key={resultId}
                                  className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-mono">
                                      <span className="font-semibold text-primary">
                                        {result.metadata.field}:
                                      </span>{" "}
                                      {result.metadata.value}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={isAdding}
                                    onClick={() => handleResultSelect([result])}
                                  >
                                    {isAdding ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Plus className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="holehe" className="flex-1 mt-4 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="space-y-4 flex-shrink-0">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    placeholder="Enter email address to search..."
                    {...form.register("emailSearch")}
                  />
                </div>

                <Button
                  onClick={searchHolehe}
                  disabled={isSearching}
                  className="w-full"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {holeheResults.length > 0 && (
                <div className="flex-1 min-h-0 mt-4">
                  <ScrollArea className="h-full rounded-md border">
                    <div className="p-4 space-y-2">
                      {holeheResults.map((result, index) => {
                        const resultId = `holehe-${result.metadata.service}-${index}`;
                        const isAdding = addingNodes.has(resultId);

                        return (
                          <div
                            key={resultId}
                            className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-mono">
                                <span className="font-semibold text-primary">
                                  {result.metadata.service}:
                                </span>{" "}
                                {result.metadata.exists ? (
                                  <span className="text-green-500">Account exists</span>
                                ) : (
                                  <span className="text-red-500">No account found</span>
                                )}
                              </p>
                              {result.metadata.emailrecovery && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Recovery email: {result.metadata.emailrecovery}
                                </p>
                              )}
                              {result.metadata.phoneNumber && (
                                <p className="text-xs text-muted-foreground">
                                  Phone: {result.metadata.phoneNumber}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isAdding}
                              onClick={() => handleResultSelect([result])}
                            >
                              {isAdding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}