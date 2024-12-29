import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="p-8 border-primary/20 bg-background/95 backdrop-blur cyberpunk-card text-center space-y-4">
        <pre className="font-mono text-primary glitch-text">
{`
 +-+-+-+-+-+-+-+
 |L|o|a|d|i|n|g|
 +-+-+-+-+-+-+-+
`}
        </pre>
        <p className="text-sm text-muted-foreground neon-text">Initializing system...</p>
      </Card>
    </div>
  );
}
