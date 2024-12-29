import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CaseList from '@/components/CaseList';
import NewCaseDialog from '@/components/NewCaseDialog';
import Loading from '@/components/Loading';
import type { Case } from '@/lib/types';
import AsciiTitle from '@/components/AsciiTitle';

export default function Home() {
  const [newCaseOpen, setNewCaseOpen] = useState(false);

  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ['/api/cases'],
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <Card className="max-w-4xl mx-auto p-6 border-primary/20 bg-background/95 backdrop-blur">
        <AsciiTitle />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            OSINT Cases
          </h1>
          <div className="flex gap-4">
            <Link href="/docs">
              <Button variant="outline">
                Documentation
              </Button>
            </Link>
            <Button onClick={() => setNewCaseOpen(true)} className="group">
              <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
              New Case
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {cases && cases.length > 0 ? (
            <CaseList cases={cases} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No cases found. Create your first case to get started.</p>
            </div>
          )}
        </div>
      </Card>

      <NewCaseDialog open={newCaseOpen} onOpenChange={setNewCaseOpen} />
    </div>
  );
}
