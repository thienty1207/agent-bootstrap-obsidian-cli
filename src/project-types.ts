export const PROJECT_TYPES = [
  'web',
  'api',
  'tool',
  'desktop',
  'mobile',
  'fullstack',
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const DEFAULT_PROJECT_TYPE: ProjectType = 'tool';

export function normalizeProjectType(value?: string): ProjectType {
  if (!value) {
    return DEFAULT_PROJECT_TYPE;
  }

  if (PROJECT_TYPES.includes(value as ProjectType)) {
    return value as ProjectType;
  }

  throw new Error(`Unsupported project type "${value}". Supported types: ${PROJECT_TYPES.join(', ')}`);
}
