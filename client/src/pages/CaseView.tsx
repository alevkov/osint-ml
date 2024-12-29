import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ArrowLeft, Upload } from "lucide-react";
import NodeDialog from "@/components/NodeDialog";
import FileUploadDialog from "@/components/FileUploadDialog";
import TagManager from "@/components/TagManager";
import Loading from "@/components/Loading";
import VisNetworkGraph from "@/components/VisGraphView";
import AccessDenied from "@/pages/AccessDenied";
import type { Case, GraphData } from "@/lib/types";
import { Link } from "wouter";

export default function CaseView() {
  const [, params] = useRoute("/case/:id");
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const { data: caseData, isLoading: caseLoading, error: caseError } = useQuery<Case>({
    queryKey: [`/api/cases/${params?.id}`],
  });

  const { data: graphData, isLoading: graphLoading, error: graphError } = useQuery<GraphData>({
    queryKey: [
      `/api/cases/${params?.id}/graph`,
      { tags: selectedTags.join(",") },
    ],
  });

  if (caseLoading || graphLoading) {
    return <Loading />;
  }

  // Show access denied page if either query returns a 403 error
  if (caseError?.message?.includes("403") || graphError?.message?.includes("403")) {
    return <AccessDenied />;
  }

  if (!caseData || !graphData) {
    return <div>Case not found</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-[1920px] mx-auto">
        <Card className="p-4 mb-4 border-primary/20 bg-background/95 backdrop-blur cyberpunk-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-primary hover:border-primary transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl neon-text">{caseData.title}</h1>
                {caseData.description && (
                  <p className="text-sm text-muted-foreground glitch-text">
                    {caseData.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  className="group hover:border-primary"
                >
                  <Upload className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                  Upload File
                </Button>
                <Button
                  onClick={() => setNodeDialogOpen(true)}
                  className="group hover:border-primary"
                >
                  <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                  Add Node
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="border-primary/20 bg-background/95 backdrop-blur cyberpunk-card h-[calc(100vh-8rem)]">
            <VisNetworkGraph data={graphData} />
          </Card>
        </div>
      </div>

      <NodeDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        caseId={caseData.id}
      />

      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        caseId={caseData.id}
      />
    </div>
  );
}