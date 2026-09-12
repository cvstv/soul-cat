import { load } from 'cheerio';
import type { Listing } from '../../src/types.js';

export const SOL_URL = 'https://www.savingonelife.org/adopt/available/';
export const LOST_URL = 'https://www.lostourhome.org/adopt-a-pet/adopt-a-cat';
export const FFL_URL = 'https://azfriends.org/adopt/adopt-a-cat/';
const clean = (value: unknown): string => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const plain = (value: unknown): string => { const $ = load(typeof value === 'string' ? value : ''); $('script,style').remove(); return clean($.root().text()); };
export function safeUrl(value: string | undefined, base?: string): string | null {
  if (!value) return null;
  try { const url = new URL(value, base); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function ageMonths(value: string): number | null {
  const years = value.match(/(\d+)\s*(?:years?|yrs?)\b/i);
  const months = value.match(/(\d+)\s*(?:months?|mos?)\b/i);
  const weeks = value.match(/(\d+)\s*(?:weeks?|wks?)\b/i);
  if (!years && !months && !weeks) return null;
  return Number(years?.[1] || 0) * 12 + Number(months?.[1] || 0) + Number(weeks?.[1] || 0) * 7 / 30.4375;
}
export function ageFromDob(value: string, now = new Date()): number | null {
  const match = value.match(/(?:date of birth|d\.?o\.?b\.?)\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (!match) return null;
  const [, m, d, y] = match;
  const birth = new Date(Date.UTC(+y, +m - 1, +d));
  if (birth.getUTCFullYear() !== +y || birth.getUTCMonth() !== +m - 1 || birth.getUTCDate() !== +d || birth > now) return null;
  return (now.getUTCFullYear() - +y) * 12 + now.getUTCMonth() - (+m - 1) - (now.getUTCDate() < +d ? 1 : 0);
}
export function baseListing(sourceId: string, shelter: string, animalId: string, name: string, adoptionUrl: string): Listing {
  if (!animalId || !name) throw new Error('Source record missing animal identity; scan rejected');
  return { sourceId, shelter, animalId, name, adoptionUrl, ageMonths: null, sex: 'Unknown', breed: 'Unknown', coat: 'Unknown', confirmation: 'unknown', city: 'Unknown', location: 'Unknown', photo: null, adoptionFee: null, description: '' };
}
/** Infer only from the individual listing's location field, never shelter headquarters or biography. */
export function cityFromLocation(location: string): string {
  const cities = ['Fountain Hills', 'Apache Junction', 'Litchfield Park', 'Sun City West', 'Queen Creek', 'Cave Creek', 'Sun City', 'Scottsdale', 'Phoenix', 'Gilbert', 'Tempe', 'Mesa', 'Chandler', 'Glendale', 'Peoria', 'Surprise', 'Goodyear', 'Avondale', 'Buckeye', 'Carefree', 'El Mirage', 'Tolleson', 'Youngtown'];
  const pattern = new RegExp(`\\b(?:${cities.join('|')})\\b`, 'gi');
  const found = new Set([...location.matchAll(pattern)].map(match => cities.find(city => city.toLowerCase() === match[0].toLowerCase())!));
  // An explicit local address abbreviation, as published by HALO.
  if (/\bPhx\.?(?=[,\s]*(?:AZ|Arizona)\b)/i.test(location)) found.add('Phoenix');
  return found.size === 1 ? [...found][0] : 'Unknown';
}
function finish(item: Listing): Listing {
  item.city = cityFromLocation(item.location);
  // A color or breed label is evidence; photos and generic “calico”/“torbie” are not.
  item.confirmation = /\b(?:tortie|tortoiseshell)\b/i.test(`${item.coat} ${item.breed}`) ? 'confirmed' : 'unknown';
  return item;
}
function requireResults(items: Listing[], source: string): Listing[] {
  if (!items.length) throw new Error(`${source}: no recognizable cat records; zero inventory not verified`);
  const seen = new Set<string>();
  return items.filter(item => { if (seen.has(item.animalId)) return false; seen.add(item.animalId); return true; });
}
export function parseSavingOneLife(html: string, now = new Date()): Listing[] {
  const $ = load(html); const cats: Listing[] = [];
  $('.picture-item.species-cat').each((_, element) => {
    const node = $(element); const photo = safeUrl(node.find('.picture-item__glyph img').attr('src'));
    const id = photo?.match(/\/animals\/\d+\/(\d+)\//)?.[1] || '';
    const name = clean(node.find('.picture-item__title').text());
    // Native browser text fragments locate this cat in the shelter's inline-card inventory.
    const item = baseListing('saving-one-life', 'Saving One Life', id, name, `${SOL_URL}#:~:text=${encodeURIComponent(name).replace(/-/g, '%2D')}`);
    item.photo = photo;
    item.breed = clean(node.find('.item__breed-tag').text()) || 'Unknown';
    item.coat = item.breed.match(/\b(?:Tortoiseshell|Tortie|Torbie|Calico|Tuxedo|Tabby)\b/i)?.[0] || 'Unknown';
    item.sex = clean(node.find('.my-pet-attributes span').eq(2).text()) || 'Unknown';
    item.description = plain(node.find('.pf-description').html());
    item.ageMonths = ageFromDob(item.description, now);
    cats.push(finish(item));
  });
  return requireResults(cats, 'Saving One Life');
}
export function parsePetango(html: string, sourceId = 'halo', shelter = 'HALO Animal Rescue'): Listing[] {
  const $ = load(html); const cats: Listing[] = [];
  $('.list-item').each((_, element) => {
    const node = $(element);
    if (clean(node.find('.list-animal-species').text()).toLowerCase() !== 'cat') return;
    const text = (field: string) => clean(node.find(`.list-animal-${field}`).text());
    const href = node.find('.list-animal-name a').attr('href') || '';
    // Extract only the quoted URL from the site's popup call; never execute JavaScript.
    const detail = href.match(/^javascript:poptastic\('(wsAdoptableAnimalDetails2\.aspx\?[^']+)'\);?$/i)?.[1];
    const url = detail ? safeUrl(detail, 'https://ws.petango.com/webservices/adoptablesearch/') : null;
    const id = text('id') || (url ? new URL(url).searchParams.get('id') || '' : '');
    if (!/^\d+$/.test(id) || !url || new URL(url).searchParams.get('id') !== id) throw new Error('Petango animal detail link changed');
    const item = baseListing(sourceId, shelter, id, text('name'), url);
    item.photo = safeUrl(node.find('.list-animal-photo').attr('src'));
    item.ageMonths = ageMonths(text('age'));
    item.sex = text('sexSN') || 'Unknown'; item.breed = text('breed') || 'Unknown';
    item.coat = text('color') || 'Unknown'; item.location = text('location') || clean(node.find('.list-animal-info-block > .hidden').text()) || 'Unknown';
    cats.push(finish(item));
  });
  return requireResults(cats, shelter);
}
/** Reads a JSON literal inside the official ASM public script. No eval or script execution. */
function extractAdoptables(script: string): unknown[] {
  const marker = /\bvar\s+adoptables\s*=\s*/g.exec(script);
  if (!marker || script[marker.index + marker[0].length] !== '[') throw new Error('ASM public array missing');
  const start = marker.index + marker[0].length;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < script.length; i++) {
    const char = script[i];
    if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; continue; }
    if (char === '"') quoted = true;
    else if (char === '[') depth++;
    else if (char === ']' && --depth === 0) {
      if (!/^\s*;/.test(script.slice(i + 1))) throw new Error('ASM array terminator changed');
      const value: unknown = JSON.parse(script.slice(start, i + 1));
      if (!Array.isArray(value)) throw new Error('ASM invalid array');
      return value;
    }
  }
  throw new Error('ASM public array truncated');
}
export function parseFriendsForLife(script: string): Listing[] {
  const rows = extractAdoptables(script); const cats: Listing[] = [];
  for (const value of rows) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('ASM unexpected record');
    const row = value as Record<string, unknown>;
    if (typeof row.SPECIESNAME !== 'string') throw new Error('ASM species field missing');
    if (row.SPECIESNAME.toLowerCase() !== 'cat') continue;
    if (typeof row.ID !== 'number' || !Number.isSafeInteger(row.ID) || row.ID <= 0) throw new Error('ASM invalid animal ID');
    const id = String(row.ID);
    const base = 'https://us06d.sheltermanager.com/service?account=zp1008';
    const item = baseListing('friends-for-life', 'Friends for Life Animal Rescue', id, clean(row.ANIMALNAME), `${base}&method=animal_view&animalid=${id}`);
    // Deliberately whitelist public animal fields. Never spread, serialize, log or persist the raw ASM record.
    item.breed = clean(row.BREEDNAME) || 'Unknown'; item.sex = clean(row.SEXNAME) || 'Unknown';
    item.coat = clean(row.BASECOLOURNAME) || 'Unknown'; item.ageMonths = ageMonths(clean(row.ANIMALAGE));
    item.location = clean(row.DISPLAYLOCATION) || 'Unknown';
    item.description = plain(row.WEBSITEMEDIANOTES);
    item.photo = typeof row.WEBSITEIMAGECOUNT === 'number' && row.WEBSITEIMAGECOUNT > 0 ? `${base}&method=animal_image&animalid=${id}` : null;
    // Feed fees use internal units; leave unknown until independently verified on the public detail page.
    cats.push(finish(item));
  }
  // An explicit valid JSON array with no cats is verified zero (including an empty array).
  return cats;
}
export function parseLostOurHome(html: string): Listing[] {
  const $ = load(html); const cats: Listing[] = [];
  $('.animals .animal').each((_, element) => {
    const node = $(element); const anchor = node.find('h3 a');
    const url = safeUrl(anchor.attr('href'), LOST_URL);
    const id = url ? new URL(url).searchParams.get('aid') || '' : '';
    if (!url || !/^\d+$/.test(id) || new URL(url).origin !== 'https://www.lostourhome.org') throw new Error('Lost Our Home animal link changed');
    const item = baseListing('lost-our-home', 'Lost Our Home Pet Rescue', id, clean(anchor.text()), url);
    const lines = node.find('p').html()?.split(/<br\s*\/?\s*>/i).map(plain) || [];
    item.breed = clean(node.find('p strong').first().text()) || 'Unknown';
    item.sex = lines.find(line => /^Sex:/i.test(line))?.replace(/^Sex:\s*/i, '') || 'Unknown';
    item.ageMonths = ageMonths(lines.find(line => /^Age:/i.test(line)) || '');
    item.location = lines.find(line => /^Status:/i.test(line))?.replace(/^Status:\s*/i, '') || 'Unknown';
    item.photo = safeUrl(node.find('a.pic').attr('style')?.match(/url\(['"]?(.*?)['"]?\)/i)?.[1]);
    cats.push(finish(item));
  });
  return requireResults(cats, 'Lost Our Home');
}
