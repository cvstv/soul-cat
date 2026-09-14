import { load } from 'cheerio';
import type { Listing } from '../../src/types.js';
import { ageMonths, baseListing, cityFromLocation } from './parsers.js';
import { fetchPublicText } from './transport.js';

export const MCACC_URL = 'https://apps.pets.maricopa.gov/adoptPets/';
const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();
export function mcaccGridUrl(page = 0): string {
  const query = new URLSearchParams({ sizeFilter: '1', ageFilter: '1', genderFilter: '1', pageNumber: String(page), animalId: '', animalName: '', kennelNum: '', env: MCACC_URL.slice(0, -1), fosterEligible: 'false', shelterFilter: 'All', animalTypeFilter: 'Cat', isLongTimer: 'false', isReadyToday: 'false', breedFilter: 'Any Breed' });
  return `${MCACC_URL}Home/AnimalGrid?${query}`;
}

export function parseMcaccGrid(html: string, page = 0): { cats: Listing[]; total: number; next: number | null } {
  const $ = load(html);
  const totalText = clean($('.searchCountLabel').text()).match(/^(\d+) Found$/);
  if (!totalText || $('#mainGrid').length !== 1) throw new Error('MCACC result count or grid missing');
  const total = Number(totalText[1]);
  if (total > 500) throw new Error('MCACC cat inventory exceeds collection limit');
  const cats: Listing[] = [];
  $('#mainGrid > li').each((_, element) => {
    const node = $(element);
    const id = node.find('a[onclick]').first().attr('onclick')?.match(/^ShowDetailsForAnimal\('(A\d{7})'\);?$/)?.[1];
    if (!id) throw new Error('MCACC animal identity changed');
    const cat = baseListing('mcacc', 'Maricopa County Animal Care & Control', id, clean(node.find('.searchPetTitleSpan').text()), `${MCACC_URL}Home/Details/${id}`);
    cat.ageMonths = ageMonths(clean(node.find('.searchPetInfoAgeSex > span').first().text()));
    cat.sex = clean(node.find('.searchPetInfoAgeSex > span').last().text()) || 'Unknown';
    // County photos are inline base64; do not persist large image payloads.
    cat.photo = null;
    cats.push(cat);
  });
  if (new Set(cats.map(c => c.animalId)).size !== cats.length || cats.length > total || (total > 0 && !cats.length)) throw new Error('MCACC inconsistent result cards');
  let next: number | null = null;
  $('button').each((_, element) => {
    const node = $(element);
    if (clean(node.text()) !== 'Next') return;
    const expression = node.attr('onclick')?.match(/^LoadAnimalGrid\((\d+)\+1\);?$/);
    if (!expression || Number(expression[1]) !== page) throw new Error('MCACC pagination changed');
    next = page + 1;
  });
  if (total === 0 && next !== null) throw new Error('MCACC empty result has pagination');
  return { cats, total, next };
}

/** Whitelist the public basic fields and About me, excluding intake and medical tables. */
export function parseMcaccDetail(html: string, listing: Listing): Listing {
  const $ = load(html); const fields = new Map<string, string>();
  $('.basicPetInfo .detailInfoBox > p, .aboutMeRow .detailInfoBox > p').each((_, element) => {
    const node = $(element); const value = clean(node.children('span').text());
    const label = clean(node.clone().children().remove().end().text()).toLowerCase();
    if (fields.has(label)) throw new Error('MCACC duplicate detail field');
    fields.set(label, value);
  });
  if (fields.get('animal id') !== listing.animalId || !fields.get('name') || !fields.has('breed')) throw new Error('MCACC detail identity or schema changed');
  const cat = { ...listing };
  cat.name = fields.get('name')!;
  cat.breed = fields.get('breed') || 'Unknown';
  cat.ageMonths = ageMonths(fields.get('age') || '');
  cat.sex = fields.get('sex') || 'Unknown';
  cat.adoptionFee = fields.get('adoption fee') || null;
  cat.location = fields.get('location') || 'Unknown';
  cat.city = cityFromLocation(cat.location);
  cat.description = fields.get('about me') || '';
  cat.photo = null;
  cat.coat = cat.breed.match(/\b(?:Tortoiseshell|Tortie|Torbie|Calico|Tuxedo|Tabby)\b/i)?.[0] || 'Unknown';
  cat.confirmation = /\b(?:tortoiseshell|tortie)\b/i.test(cat.coat) ? 'confirmed' : 'unknown';
  return cat;
}

async function collectMcaccPages(read: (url: string) => Promise<string>): Promise<Listing[]> {
  const cats: Listing[] = []; const seen = new Set<string>(); let total: number | undefined;
  for (let page = 0; page < 50; page++) {
    const result = parseMcaccGrid(await read(mcaccGridUrl(page)), page);
    if (total !== undefined && result.total !== total) throw new Error('MCACC inventory changed during pagination; retry later');
    total = result.total;
    for (const cat of result.cats) {
      if (seen.has(cat.animalId)) throw new Error('MCACC repeated animal across pages');
      seen.add(cat.animalId); cats.push(cat);
    }
    if (result.next === null) {
      if (cats.length !== total) throw new Error('MCACC incomplete inventory');
      const detailed: Listing[] = [];
      for (let i = 0; i < cats.length; i += 3) {
        detailed.push(...await Promise.all(cats.slice(i, i + 3).map(async cat => parseMcaccDetail(await read(cat.adoptionUrl), cat))));
      }
      return detailed;
    }
  }
  throw new Error('MCACC pagination limit exceeded');
}

/** Overall deadline also prevents a timed-out collection from scheduling more work. */
export async function collectMcacc(read: (url: string) => Promise<string> = fetchPublicText): Promise<Listing[]> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = Date.now() + 20_000;
  const boundedRead = async (url: string): Promise<string> => {
    if (expired || Date.now() >= deadline) throw new Error('MCACC collection deadline exceeded');
    const html = await read(url);
    if (expired || Date.now() >= deadline) throw new Error('MCACC collection deadline exceeded');
    return html;
  };
  try {
    return await Promise.race([
      collectMcaccPages(boundedRead),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { expired = true; reject(new Error('MCACC collection deadline exceeded')); }, 20_000); }),
    ]);
  } finally { expired = true; clearTimeout(timer); }
}

export const phoenixBlockers = {
  ahs: 'Official /adopt/ and /adopt2/ return a Sucuri JavaScript challenge; no public inventory feed verified without bypass.',
  aawl: 'Official /adoptable-cats returns a Cloudflare Attention Required challenge; no public inventory feed verified without bypass.',
} as const;
