type ScanEnvironment = { SITE_ID?: string; NETLIFY?: string; CONTEXT?: string; SOULCAT_SCAN_ENABLED?: string };

export function isNetlifyRuntime(env: ScanEnvironment): boolean {
  return Boolean(env.SITE_ID || env.NETLIFY);
}

export function scanAllowedHere(env: ScanEnvironment): boolean {
  return !isNetlifyRuntime(env) || env.SOULCAT_SCAN_ENABLED === 'true';
}
