export interface Case {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Node {
  id: number;
  caseId: number;
  type: 'text' | 'link';
  content: string;
  metadata: any;
  embedding: number[];
  x?: number;
  y?: number;
  createdAt: string;
}

export interface Relationship {
  id: number;
  caseId: number;
  sourceId: number;
  targetId: number;
  type: string;
  strength: number;
}

export interface GraphData {
  nodes: Node[];
  links: Relationship[];
}
