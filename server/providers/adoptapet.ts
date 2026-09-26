import { load } from 'cheerio';
import type { Listing } from '../../src/types.js';
import { ageMonths, baseListing, safeUrl } from './parsers.js';
import { fetchPublicText } from './transport.js';

export interface AdoptapetOptions { sourceId: string; sourceName: string; postalCode: string; shelterIds?: number[]; excludeShelterIds?: number[] }
const PHOENIX: AdoptapetOptions = { sourceId: 'adopt-a-pet', sourceName: 'Adopt a Pet', postalCode: '85003', excludeShelterIds: [74640, 74639, 211008] };
const PAGE_SIZE = 42;
export function adoptapetUrl(page = 1, options: AdoptapetOptions = PHOENIX): string {
  const params = new URLSearchParams({ speciesId: '2', postalCode: options.postalCode, radius: '50', transport: '0', sortOption: 'Newest', page: String(page) });
  options.shelterIds?.forEach((id, i) => params.set(`awos[${i}]`, String(id)));
  return `https://www.adoptapet.com/pet-search?${params}`;
}
export const ADOPTAPET_URL = adoptapetUrl();
const clean = (v: unknown): string => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
const plain = (v: unknown): string => { const $ = load(clean(v)); $('script,style').remove(); return clean($.text()); };

/** Only the actual search results component counts; SEO samples and nearby suggestions do not. */
export function parseAdoptapetPage(html: string, page = 1, options: AdoptapetOptions = PHOENIX): { cats: Listing[]; total: number; pages: number; excludedAnimalIds: string[] } {
  // Decode the public HTML attribute without constructing the multi-megabyte surrounding DOM.
  const components = [...html.matchAll(/\bwire:initial-data="([^"]*)"/g)].map(m => {
    const $ = load(`<div data-value="${m[1]}"></div>`);
    return JSON.parse($('div').attr('data-value')!);
  }).filter(d => d?.fingerprint?.name === 'pet-search-results');
  if (components.length !== 1) throw new Error('Adopt a Pet search results missing or ambiguous');
  const d = components[0].serverMemo?.data;
  const f = d?.filters;
  const requested = [...(options.shelterIds || [])].sort((a,b) => a-b);
  const returned = Array.isArray(f?.awos) ? f.awos.map(Number).sort((a:number,b:number) => a-b) : [];
  if (d?.sortOption !== 'Newest' || d?.adType !== 'cat' || d?.speciesText !== 'cat' || Number(d.page) !== page || !d.isTotalExact || !Number.isSafeInteger(d.petTotal) || d.petTotal < 0 || d.petTotal > 4200 || !Array.isArray(d.petsCollection) || !Array.isArray(d.petIds) || f?.postalCode !== options.postalCode || Number(f.radius) !== 50 || f.transport !== false || JSON.stringify(f.speciesIds) !== '[2]' || JSON.stringify(requested) !== JSON.stringify(returned)) throw new Error('Adopt a Pet search scope, exact count or schema changed');
  const total: number = d.petTotal; const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const expected = Math.min(PAGE_SIZE, Math.max(0, total - (page - 1) * PAGE_SIZE));
  if (page > pages || d.petsCollection.length !== expected || d.petIds.length !== expected) throw new Error('Adopt a Pet incomplete page');
  const cats: Listing[] = d.petsCollection.map((pet: Record<string, any>, i: number) => {
    const id = String(pet.petId);
    const url = safeUrl(pet.pdpRoute);
    if (!/^\d+$/.test(id) || Number(id) <= 0 || d.petIds[i] !== pet.petId || pet.clanId !== 2 || pet.adopted !== false || (pet.isTransport !== false && pet.isTransport !== null) || !url || new URL(url).origin !== 'https://www.adoptapet.com' || !new URL(url).pathname.startsWith(`/pet/${id}-`) || (requested.length && !requested.includes(Number(pet.shelterId)))) throw new Error('Adopt a Pet card identity or search scope changed');
    const cat = baseListing(options.sourceId, clean(pet.shelterName) || options.sourceName, id, clean(pet.name), url);
    cat.ageMonths = ageMonths(clean(pet.age)); cat.sex = pet.sex === 'f' ? 'Female' : pet.sex === 'm' ? 'Male' : 'Unknown';
    cat.breed = clean(pet.breed) || 'Unknown'; cat.coat = clean(pet.color) || 'Unknown';
    cat.confirmation = /\b(?:tortie|tortoiseshell)\b/i.test(`${cat.coat} ${cat.breed}`) ? 'confirmed' : 'unknown';
    cat.location = [clean(pet.address?.city), clean(pet.address?.state)].filter(Boolean).join(', ') || 'Unknown';
    cat.city = clean(pet.address?.city) || 'Unknown'; cat.description = plain(pet.description);
    const photo = safeUrl(pet.photoUrl); cat.photo = photo && new URL(photo).hostname === 'pet-uploads.adoptapet.com' ? photo : null;
    return cat;
  });
  if (new Set(cats.map(c => c.animalId)).size !== cats.length) throw new Error('Adopt a Pet duplicate animal');
  return { cats, total, pages, excludedAnimalIds: d.petsCollection.filter((p: Record<string, any>) => options.excludeShelterIds?.includes(Number(p.shelterId))).map((p: Record<string, any>) => String(p.petId)) };
}

export async function collectAdoptapetSearch(options: AdoptapetOptions = PHOENIX, read: (url: string) => Promise<string> = fetchPublicText): Promise<Listing[]> {
  let expired = false; let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = Date.now() + 20_000;
  const check = () => { if (expired || Date.now() >= deadline) throw new Error('Adopt a Pet collection deadline exceeded'); };
  const get = async (page: number) => { check(); const html = await read(adoptapetUrl(page, options)); check(); return parseAdoptapetPage(html, page, options); };
  const collect = async () => {
    const first = await get(1); const results = [first]; let next = 2;
    await Promise.all(Array.from({ length: Math.min(4, first.pages - 1) }, async () => {
      while (next <= first.pages) { check(); const result = await get(next++); if (result.total !== first.total || result.pages !== first.pages) throw new Error('Adopt a Pet inventory changed during pagination'); results.push(result); }
    }));
    check(); const cats = results.flatMap(r => r.cats);
    if (cats.length !== first.total || new Set(cats.map(c => c.animalId)).size !== first.total) throw new Error('Adopt a Pet incomplete or repeated inventory');
    const excluded = new Set(results.flatMap(r => r.excludedAnimalIds));
    return cats.filter(c => !excluded.has(c.animalId));
  };
  try { return await Promise.race([collect(), new Promise<never>((_,reject) => { timer = setTimeout(() => { expired = true; reject(new Error('Adopt a Pet collection deadline exceeded')); }, 20_000); })]); }
  finally { expired = true; clearTimeout(timer); }
}
export const collectAdoptapet = (): Promise<Listing[]> => collectAdoptapetSearch();
