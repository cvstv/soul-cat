import {collectAdoptapetSearch} from './adoptapet';
import {fetchPublicText} from './transport';

// These are AHS's three shelter-owned Adoptapet campus listings. The official
// AHS site's browser challenge is not bypassed; this is the public syndication.
export const AHS_SEARCH = {
  sourceId: 'ahs',
  sourceName: 'Arizona Humane Society via Adoptapet',
  postalCode: '85008',
  shelterIds: [74640, 74639, 211008],
};

export function collectAhs(read: (url: string) => Promise<string> = fetchPublicText) {
  return collectAdoptapetSearch(AHS_SEARCH, read);
}
