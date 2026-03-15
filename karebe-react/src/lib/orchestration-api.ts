const DEFAULT_PROD_ORCHESTRATION_URL = 'https://karebe-orchestration-production.up.railway.app';

function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, '');
}

const envUrl = import.meta.env.VITE_ORCHESTRATION_API_URL;
const fallbackUrl = import.meta.env.DEV ? 'http://localhost:3001' : DEFAULT_PROD_ORCHESTRATION_URL;

export const orchestrationOrigin = normalizeOrigin(envUrl || fallbackUrl);
export const orchestrationApiBase = `${orchestrationOrigin}/api`;

export function withOrchestrationApi(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${orchestrationApiBase}${normalizedPath}`;
}
