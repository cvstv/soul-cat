import {collectAawl,AAWL_URL} from './aawl';
import {collectMcacc,MCACC_URL} from './phoenix';
import {collectKneading,KNEADING_URL} from './kneading';
import type { Listing } from '../../src/types.js';
import { FFL_URL, LOST_URL, SOL_URL, parseFriendsForLife, parseLostOurHome, parsePetango, parseSavingOneLife } from './parsers.js';
import { fetchPublicText } from './transport.js';
export interface Provider { id: string; name: string; url: string; connected: boolean; reason?: string; collect?: () => Promise<Listing[]>; }
// Petango's authkey is the public embed identifier published on the shelter's adoption page, not a private credential.
const haloFeed = 'https://ws.petango.com/webservices/adoptablesearch/wsAdoptableAnimals2.aspx?species=Cat&gender=A&agegroup=All&location=&site=&onhold=A&orderby=ID&colnum=3&css=https://ws.petango.com/WebServices/adoptablesearch/css/styles.css&authkey=p1hcyln2w8x44ggh4axsf25ldm2r7ukd1nsv48xu5dhh4pnlqh&recAmount=&detailsInPopup=Yes&featuredPet=Include&stageID=';
const fearlessFeed = 'https://ws.petango.com/webservices/adoptablesearch/wsAdoptableAnimals2.aspx?species=All&gender=A&agegroup=All&location=&site=&onhold=A&orderby=Name&colnum=3&css=&authkey=4dnxx4ls4al30uhflxneid5b6j00j4n4qmv5wvxa5oi05fryc4&recAmount=&detailsInPopup=Yes&featuredPet=Include&stageID=';
export const registry: Provider[] = [
  { id: 'saving-one-life', name: 'Saving One Life', url: SOL_URL, connected: true, collect: async () => parseSavingOneLife(await fetchPublicText(SOL_URL)) },
  { id: 'halo', name: 'HALO Animal Rescue', url: 'https://halorescue.org/cat-adoption/', connected: true, collect: async () => parsePetango(await fetchPublicText(haloFeed)) },
  { id: 'friends-for-life', name: 'Friends for Life Animal Rescue', url: FFL_URL, connected: true, collect: async () => parseFriendsForLife(await fetchPublicText('https://service.sheltermanager.com/asmservice?method=animal_view_adoptable_js&account=zp1008')) },
  { id: 'lost-our-home', name: 'Lost Our Home Pet Rescue', url: LOST_URL, connected: true, collect: async () => parseLostOurHome(await fetchPublicText(LOST_URL)) },
  { id: 'fearless-kitty', name: 'Fearless Kitty Rescue', url: 'https://fearlesskittyrescue.org/adoptable/', connected: true, collect: async () => parsePetango(await fetchPublicText(fearlessFeed), 'fearless-kitty', 'Fearless Kitty Rescue') },
  { id: 'ahs', name: 'Arizona Humane Society', url: 'https://www.azhumane.org/adopt/', connected: false, reason: 'The shelter website blocks automated reads; browse its listings directly.' },
  { id: 'mcacc', name: 'Maricopa County Animal Care & Control', url: MCACC_URL, connected: true, collect: () => collectMcacc() },
  { id: 'aawl', name: 'Arizona Animal Welfare League', url: AAWL_URL, connected: true, collect: () => collectAawl() },
  { id: 'desert-paws', name: 'Desert Paws Rescue', url: 'https://desertpawsrescue.org/adopt', connected: false, reason: 'Its embedded Petfinder feed currently denies automated access.' },
  { id: 'kneading-kitty', name: 'Kneading Kitty’s Rescue', url: KNEADING_URL, connected: true, collect: collectKneading },
  { id: 'petfinder', name: 'Petfinder', url: 'https://www.petfinder.com/', connected: false, reason: 'No authorized listing integration configured.' },
  { id: 'adopt-a-pet', name: 'Adopt a Pet', url: 'https://www.adoptapet.com/', connected: false, reason: 'No authorized listing integration configured.' },
];
