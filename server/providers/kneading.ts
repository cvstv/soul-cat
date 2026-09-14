import {load} from 'cheerio';
import {ageMonths,baseListing,safeUrl} from './parsers';
import {fetchPublicText} from './transport';
import type {Listing} from '../../src/types';
export const KNEADING_URL='https://kneadingkittysrescueaz.com/all-list-view-1';
// Public widget identifiers published by the rescue, not private API credentials.
export const KNEADING_FEED='https://toolkit.rescuegroups.org/j/3/list3_layout.php?toolkitIndex=0&toolkitKey=NzBhT4x1';
export function parseKneading(html:string):Listing[]{
 const $=load(html),cats:Listing[]=[];
 const summary=$('.rgtkSearchFoundSummary').text().match(/(\d+)\s+pets?\s+found/i);
 const rows=$('.rgtkSearchResultsTable tr[id^=pet]');
 if(!summary||rows.length!==Number(summary[1]))throw new Error('Kneading Kitty inventory incomplete or format changed');
 rows.each((_,element)=>{
  const node=$(element),id=node.attr('id')?.match(/^pet(\d+)$/)?.[1];
  const field=(key:string)=>{const clone=node.find(`[id="rgtkSearchPetInfoAnimal${key}"]`).clone();clone.find('.rgtkSearchPetInfoTitle,script,style').remove();return clone.text().replace(/\s+/g,' ').trim();};
  const name=field('Name');if(/generic cat selection/i.test(name))return;
  if(!id||!name)throw new Error('Missing Kneading Kitty animal identity');
  // The widget's own share link format (pet2_layout.js).
  const cat=baseListing('kneading-kitty','Kneading Kitty’s Rescue',id,name,`https://toolkit.rescuegroups.org/j/3/pet?a=${id}&k=7816`);
  cat.breed=field('Breed')||'Unknown';cat.sex=field('Sex')||'Unknown';cat.ageMonths=ageMonths(field('AgeString'));
  cat.coat=cat.breed.match(/\b(?:Dilute Tortoiseshell|Tortoiseshell|Tortie|Torbie|Calico|Tuxedo|Tabby)\b/i)?.[0]||'Unknown';
  cat.confirmation=/tortoiseshell|tortie/i.test(cat.coat)?'confirmed':'unknown';
  cat.adoptionFee=field('AdoptionFee')||null;cat.description=field('Description');
  cat.photo=safeUrl(node.find('.rgtkSearchPetPicImg').first().attr('src'));
  cats.push(cat);
 });
 return cats;
}
export async function collectKneading(){return parseKneading(await fetchPublicText(KNEADING_FEED));}
