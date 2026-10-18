import type { IngestionCandidate } from './ingestion.types.js';
export declare function parseJsonCandidates(content: string): IngestionCandidate[];
export declare function parseCsvRows(content: string): Array<Record<string, string>>;
export declare function parseCsvCandidates(content: string): IngestionCandidate[];
