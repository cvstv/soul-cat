import type {Listing} from '../../src/types';
import {baseListing,safeUrl} from './parsers';
import {fetchPublicText} from './transport';

export interface ShelterluvOrg {id:string;name:string;url:string;shelterId:number;prefix:string;city:string;}

const text=(value:unknown)=>typeof value==='string'?value.replace(/\s+/g,' ').trim():'';
export function parseShelterluv(body:string,org:ShelterluvOrg,now=new Date()):Listing[]{
 let data:unknown;try{data=JSON.parse(body);}catch{throw new Error('Shelterluv returned invalid JSON');}
 if(!data||typeof data!=='object'||!('animals' in data)||!Array.isArray(data.animals))throw new Error('Shelterluv animal array missing');
 const cats:Listing[]=[],seen=new Set<string>();
 for(const raw of data.animals){
  if(!raw||typeof raw!=='object')throw new Error('Shelterluv record is not an object');
  const row=raw as Record<string,unknown>;
  if(typeof row.species!=='string')throw new Error('Shelterluv species missing');
  if(row.species.toLowerCase()!=='cat')continue;
  if(row.adoptable!==1)throw new Error('Shelterluv nonadoptable record in public inventory');
  const id=text(row.uniqueId),name=text(row.name),url=safeUrl(text(row.public_url));
  if(!id.startsWith(org.prefix+'-A-')||!name||!url||url!==`https://www.shelterluv.com/embed/animal/${encodeURIComponent(id)}`)throw new Error('Shelterluv cat identity or public URL changed');
  if(seen.has(id))throw new Error('Shelterluv duplicate cat ID');seen.add(id);
  const cat=baseListing(org.id,org.name,id,name,url);
  cat.sourceCity=org.city;
  cat.sex=text(row.sex)||'Unknown';cat.breed=text(row.breed)||'Unknown';
  cat.location=text(row.location)||'Unknown';
  const birthday=Number(row.birthday);
  if(Number.isFinite(birthday)&&birthday>0&&birthday*1000<=now.getTime()){
   const date=new Date(birthday*1000);
   cat.ageMonths=Math.max(0,(now.getUTCFullYear()-date.getUTCFullYear())*12+now.getUTCMonth()-date.getUTCMonth()-(now.getUTCDate()<date.getUTCDate()?1:0));
  }
  const color=[text(row.primary_color),text(row.secondary_color)].join(' ');
  cat.coat=color.match(/\b(?:dilute tortoiseshell|tortoiseshell|tortie|torbie|calico|tuxedo|tabby)\b/i)?.[0]||'Unknown';
  cat.confirmation=/\b(?:tortoiseshell|tortie)\b/i.test(cat.coat+' '+cat.breed)?'confirmed':'unknown';
  if(Array.isArray(row.photos)){
   const photos=row.photos.filter((v):v is Record<string,unknown>=>!!v&&typeof v==='object');
   cat.photo=safeUrl(text((photos.find(p=>p.isCover===true)||photos[0])?.url));
  }
  cats.push(cat);
 }
 return cats;
}
export async function collectShelterluv(org:ShelterluvOrg):Promise<Listing[]>{
 return parseShelterluv(await fetchPublicText(`https://www.shelterluv.com/api/v3/available-animals/${org.shelterId}`),org);
}
