export interface GeneratedManifest {
  schemaVersion: number;
  generatorVersion: string;
  catalogSha256: string;
  entries: Array<Record<string, unknown>>;
}

export function buildSearchIndexArtifacts(options: Record<string, unknown>): Promise<{
  files: Map<string, string>;
  manifest: GeneratedManifest;
}>;
export function publishSearchIndexArtifacts(options: {
  files: Map<string, string>;
  outputDirectory: string;
  mode: "update" | "check";
}): void;
export function parseIndexCatalog(source: string): Array<Record<string, unknown>>;
export function readPreviousManifest(outputDirectory: string): GeneratedManifest | undefined;
