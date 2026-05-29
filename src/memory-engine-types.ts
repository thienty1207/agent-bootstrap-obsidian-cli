export type MemoryEngineProvider = 'node' | 'rust' | 'node-fallback';

export type MemoryEngineScope =
  | 'current-project'
  | 'global-approved'
  | 'global-candidate'
  | 'cross-project';

export type MemoryConfidence = 'high' | 'medium' | 'low';

export interface MemoryEngineDocument {
  id: string;
  kind: string;
  title: string;
  path: string;
  relativePath: string;
  projectSlug: string | null;
  projectType: string | null;
  scope: MemoryEngineScope;
  confidence: MemoryConfidence;
  proof: boolean;
  status: string;
  concepts: string[];
  preview: string;
  bytes: number;
  updatedAt: string;
}

export interface MemoryEngineIndex {
  version: 1;
  mode: 'memory-engine';
  provider: MemoryEngineProvider;
  generatedAt: string;
  vaultRoot: string;
  currentProjectSlug: string;
  documents: MemoryEngineDocument[];
  diagnostics: string[];
}

export interface MemoryEngineResult extends MemoryEngineDocument {
  score: number;
  snippet: string;
  scoreBreakdown: {
    lexical: number;
    concept: number;
    scope: number;
    confidence: number;
    recency: number;
    proof: number;
  };
}
