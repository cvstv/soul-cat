const ALLOWED_ORIGINS = new Set([
  'https://aawl.org', 'https://apps.pets.maricopa.gov', 'https://toolkit.rescuegroups.org', 'https://www.savingonelife.org', 'https://ws.petango.com',
  'https://service.sheltermanager.com', 'https://us06d.sheltermanager.com', 'https://www.lostourhome.org',
]);
export const MAX_BYTES = 5 * 1024 * 1024;
/** Fixed registry URLs only. Redirects are revalidated before each request. */
export async function fetchPublicText(input: string): Promise<string> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    let url = new URL(input);
    for (let redirects = 0; redirects <= 3; redirects++) {
      if (!ALLOWED_ORIGINS.has(url.origin) || url.username || url.password) throw new Error('Source URL origin not allowed');
      const response = await fetch(url, { signal: controller.signal, redirect: 'manual', headers: { Accept: 'text/html,application/javascript,text/javascript', 'User-Agent': 'SoulCat/1.0 public adoption inventory' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const next = response.headers.get('location'); if (!next) throw new Error('Source redirect missing location');
        url = new URL(next, url); continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`Source returned HTTP ${response.status}`); }
      if (Number(response.headers.get('content-length') || 0) > MAX_BYTES) { await response.body?.cancel(); throw new Error('Source exceeds 5 MB limit'); }
      if (!response.body) throw new Error('Source returned no body');
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Source exceeds 5 MB limit'); } chunks.push(value); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const result = new TextDecoder().decode(bytes);
      if (!result.trim()) throw new Error('Source returned blank content');
      if (/cf-chl-|Just a moment\.\.\.|checking your browser/i.test(result)) throw new Error('Source challenge requires manual review');
      return result;
    }
    throw new Error('Source redirect limit exceeded');
  } finally { clearTimeout(timer); }
}
