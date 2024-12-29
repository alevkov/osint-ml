import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import type { Case } from '@/lib/types';

interface CaseListProps {
  cases: Case[];
}

export default function CaseList({ cases }: CaseListProps) {
  return (
    <div className="grid gap-4">
      {cases.map((case_) => (
        <Link key={case_.id} href={`/case/${case_.id}`}>
          <Card className="p-4 hover:bg-primary/5 transition-colors cursor-pointer border-primary/20 cyberpunk-card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg neon-text">{case_.title}</h2>
                {case_.description && (
                  <p className="text-sm text-muted-foreground mt-1">{case_.description}</p>
                )}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 mr-1" />
                {new Date(case_.createdAt).toLocaleDateString()}
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
