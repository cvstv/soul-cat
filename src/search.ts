import type {Cat} from './types';
export interface Filters {q:string;city:string;source:string;age:string;sex:string;breed:string;coat:string;sort:string;unknownAge:boolean;includeMissing:boolean;savedOnly:boolean;}
export const defaults:Filters={q:'',city:'',source:'',age:'',sex:'',breed:'',coat:'',sort:'newest',unknownAge:true,includeMissing:false,savedOnly:false};
const fields=['q','city','source','age','sex','breed','coat','sort'] as const;
export function readFilters(search:string):Filters{
 const p=new URLSearchParams(search),f={...defaults};
 for(const key of fields)if(p.has(key))f[key]=(p.get(key)||'').slice(0,200);
 if(!['','kitten','young','adult','senior'].includes(f.age))f.age='';
 if(!['','female','male','unknown'].includes(f.sex))f.sex='';
 if(!['newest','youngest','oldest','name','recent'].includes(f.sort))f.sort='newest';
 f.unknownAge=p.get('unknownAge')!=='false';f.includeMissing=p.get('includeMissing')==='true';
 return f;
}
export function writeFilters(f:Filters){
 const p=new URLSearchParams();for(const k of fields)if(f[k]&&f[k]!==defaults[k])p.set(k,f[k]);
 if(!f.unknownAge)p.set('unknownAge','false');if(f.includeMissing)p.set('includeMissing','true');return p.toString();
}
const lower=(s:string)=>s.trim().toLocaleLowerCase('en-US');
const coatTerm=(s:string)=>lower(s).replace(/\btorties?\b/g,'tortoiseshell');
export function ageLabel(value:number|null){
 if(value===null||!Number.isFinite(value)||value<0)return 'Age not listed';
 if(value<1)return 'Under 1 month';
 const months=Math.floor(value);if(months<12)return `${months} ${months===1?'month':'months'}`;
 const years=Math.floor(months/12),rest=months%12;return `${years} ${years===1?'year':'years'}${rest?`, ${rest} mo`:''}`;
}
export function filterCats(cats:Cat[],f:Filters,saved:Set<string>){
 const query=coatTerm(f.q).split(/\s+/).filter(Boolean);
 const bounds:Record<string,[number,number]>={kitten:[0,12],young:[12,36],adult:[36,120],senior:[120,Infinity]};
 return cats.filter(c=>{
  if(!f.includeMissing&&c.availability!=='listed')return false;
  if(f.savedOnly&&!saved.has(c.key))return false;
  if(f.city&&c.city!==f.city||f.source&&c.sourceId!==f.source)return false;
  if(c.ageMonths===null){if(!f.unknownAge)return false;}else if(f.age){const [min,max]=bounds[f.age]||[0,Infinity];if(c.ageMonths<min||c.ageMonths>=max)return false;}
  if(f.sex&&lower(c.sex).split('/')[0].trim()!==f.sex)return false;
  if(f.breed&&!lower(c.breed).includes(lower(f.breed)))return false;
  if(f.coat&&!coatTerm(c.coat+' '+c.breed).includes(coatTerm(f.coat)))return false;
  const text=coatTerm([c.name,c.breed,c.coat,c.shelter,c.city,c.description].join(' '));
  return query.every(term=>text.includes(term));
 }).sort((a,b)=>{
  let comparison=0;
  if(f.sort==='name')comparison=a.name.localeCompare(b.name);
  else if(f.sort==='youngest'||f.sort==='oldest'){
   if(a.ageMonths===null&&b.ageMonths!==null)return 1;
   if(b.ageMonths===null&&a.ageMonths!==null)return -1;
   comparison=((a.ageMonths||0)-(b.ageMonths||0))*(f.sort==='oldest'?-1:1);
  }else comparison=Date.parse(f.sort==='recent'?b.lastSeen:b.firstSeen)-Date.parse(f.sort==='recent'?a.lastSeen:a.firstSeen);
  return comparison||a.name.localeCompare(b.name)||a.key.localeCompare(b.key);
 });
}
