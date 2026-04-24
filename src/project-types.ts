export const PROJECT_TYPES = [
  'frontend',
  'backend',
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

  if (value === 'web') {
    return 'frontend';
  }

  if (value === 'api') {
    return 'backend';
  }

  if (PROJECT_TYPES.includes(value as ProjectType)) {
    return value as ProjectType;
  }

  throw new Error(`Unsupported project type "${value}". Supported types: ${PROJECT_TYPES.join(', ')}`);
}
