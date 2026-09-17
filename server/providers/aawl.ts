import {load} from 'cheerio';
import type {Listing} from '../../src/types';
import {ageMonths,baseListing,cityFromLocation,safeUrl} from './parsers';
import {fetchPublicText} from './transport';
export const AAWL_URL='https://aawl.org/adopt/cats/';
export function parseAawlPage(raw:string,page:number){
 const data=JSON.parse(raw);
 if(!Array.isArray(data.items)||!Number.isInteger(data.total)||data.total<0||data.total>500||data.page!==page||typeof data.has_more!=='boolean')throw new Error('AAWL feed schema changed');
 const cats:Listing[]=data.items.map((html:unknown)=>{
  if(typeof html!=='string')throw new Error('AAWL card malformed');
  const $=load(html),node=$('.c-card-pet'),id=node.attr('data-petango-id'),name=node.find('.c-card-pet__name').text().trim();
  if(node.length!==1||!id||!/^\d+$/.test(id)||!name||node.find('.c-card-pet__link').attr('href')?.replace(/\/$/,'')!==`https://aawl.org/adopt/${id}`)throw new Error('AAWL identity missing');
  const cat=baseListing('aawl','Arizona Animal Welfare League',id,name,`https://aawl.org/adopt/${id}/`);
  cat.photo=safeUrl(node.find('img').attr('src'));return cat;
 });
 return {cats,total:data.total as number,more:data.has_more as boolean};
}
export function parseAawlDetail(html:string,listing:Listing):Listing{
 const $=load(html),node=$(`[data-pet-detail][data-petango-id="${listing.animalId}"]`);
 if(node.length!==1||$('link[rel="canonical"]').attr('href')!==listing.adoptionUrl)throw new Error('AAWL detail identity changed');
 const stat=(key:string)=>node.find(`.c-pet-detail__stat--${key} .c-pet-detail__stat-label`).text().replace(/\s+/g,' ').trim();
 const cat={...listing};cat.ageMonths=ageMonths(stat('age'));cat.sex=stat('sex')||'Unknown';cat.adoptionFee=stat('fee')||null;cat.location=stat('site')||'Unknown';cat.city=cityFromLocation(cat.location);
 cat.description=node.find('.c-pet-detail__bio').text().replace(/\s+/g,' ').trim();
 // Use the source's explicit metadata, never infer breed/coat from photographs or biography.
 const meta=$('meta[property="og:description"]').attr('content')||'';
 cat.breed=meta.match(/ is a (?:Baby|Young|Adult|Senior) (.+?) cat looking for/)?.[1]||'Unknown';
 const label=node.find('.c-pet-detail__photo').first().attr('alt')||'';
 cat.coat=label.match(/\b(?:Dilute Tortoiseshell|Tortoiseshell|Tortie|Torbie|Calico|Tuxedo|Tabby)\b/i)?.[0]||'Unknown';cat.confirmation=/tortoiseshell|tortie/i.test(cat.coat)?'confirmed':'unknown';
 return cat;
}
export async function collectAawl(read:(url:string)=>Promise<string>=fetchPublicText):Promise<Listing[]>{
 let expired=false;let timer:ReturnType<typeof setTimeout>|undefined;
 const get=async(url:string)=>{if(expired)throw new Error('AAWL deadline');const text=await read(url);if(expired)throw new Error('AAWL deadline');return text;};
 const collect=async()=>{
  const cats:Listing[]=[];let total:number|undefined;
  for(let page=1;page<=50;page++){
   const result=parseAawlPage(await get(`https://aawl.org/wp-json/aawl/v1/pets?species=cat&page=${page}&per_page=12&sort=patient`),page);
   if(total!==undefined&&result.total!==total)throw new Error('AAWL inventory changed during scan');total=result.total;cats.push(...result.cats);
   if(new Set(cats.map(c=>c.animalId)).size!==cats.length||cats.length>total)throw new Error('AAWL duplicate inventory');
   if(!result.more){
    if(cats.length!==total)throw new Error('AAWL incomplete inventory');
    const detailed:Listing[]=[];
    for(let i=0;i<cats.length;i+=4)detailed.push(...await Promise.all(cats.slice(i,i+4).map(async cat=>parseAawlDetail(await get(cat.adoptionUrl),cat))));
    return detailed;
   }
   if(!result.cats.length||cats.length===total)throw new Error('AAWL inconsistent pagination');
  }
  throw new Error('AAWL pagination limit');
 };
 try{return await Promise.race([collect(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new Error('AAWL collection timeout'));},20000);})]);}finally{expired=true;clearTimeout(timer);}
}
