import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import AsciiTitle from "@/components/AsciiTitle";

export default function Documentation() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <Card className="max-w-4xl mx-auto p-6 border-primary/20 bg-background/95 backdrop-blur">
        <AsciiTitle />

        <div className="mb-6 flex items-center">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Cases
            </Button>
          </Link>
        </div>

        <article className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-8">
            Documentation
          </h1>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              Creating Cases
            </h2>
            <div className="space-y-4">
              <p>To create a new OSINT investigation case:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Click the "New Case" button in the top-right corner of the
                  home page
                </li>
                <li>Enter a descriptive title for your investigation</li>
                <li>Optionally, add a detailed description of the case</li>
                <li>Click "Create Case" to begin your investigation</li>
              </ol>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              Adding Data
            </h2>
            <div className="space-y-4">
              <p>You can add data to your case in two ways:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <strong>Manual Entry:</strong> Click "Add Node" to manually
                  input a piece of information
                </li>
                <li>
                  <strong>File Upload:</strong> Use "Upload File" to process
                  text documents containing relevant information
                </li>
              </ol>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              Understanding the Visualization
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-primary/90 mb-2">
                  Node Colors and Topics
                </h3>
                <p>
                  Each node is automatically classified into topics and colored
                  accordingly. The system analyzes the content to determine the
                  most relevant category:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Identity information (names, profiles)</li>
                  <li>Location data (addresses, coordinates)</li>
                  <li>Communication details (emails, phone numbers)</li>
                  <li>Temporal information (dates, timeframes)</li>
                  <li>Organizations and entities</li>
                  <li>
                    Other categories (e.g., financial information, legal
                    documents)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-primary/90 mb-2">
                  Semantic Relationships
                </h3>
                <p>Lines connecting nodes represent semantic relationships:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <span className="text-cyan-400">Cyan lines</span> indicate
                    automatically detected relationships based on semantic
                    similarity
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-primary/90 mb-2">
                  Graph Navigation
                </h3>
                <p>Interact with the visualization:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Drag the background to pan the view</li>
                  <li>More interactivity features coming soon</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-4">
              Tips for Better Results
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Use clear, concise text when adding information</li>
              <li>
                Label your data with descriptive tags, e.g. "Phone:
                +1XXXXXXXXXX"
              </li>
              <li>Include relevant context in node descriptions</li>
            </ul>
          </section>
        </article>
      </Card>
    </div>
  );
}
