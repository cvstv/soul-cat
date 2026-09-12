import type {Client, InStatement} from '@libsql/client';
import type {Cat,Listing,Scan,Source} from '../src/types';
export async function beginScan(db:Client,trigger:string,now=new Date()):Promise<Scan|null>{
 const tx=await db.transaction('write');
 try{
  const lock=await tx.execute({sql:`INSERT INTO locks(name,expires) VALUES('scan',?) ON CONFLICT(name) DO UPDATE SET expires=excluded.expires WHERE locks.expires<=? RETURNING name`,args:[now.getTime()+300000,now.getTime()]});
  if(!lock.rows.length){await tx.rollback();return null;}
  const scan:Scan={id:crypto.randomUUID(),startedAt:now.toISOString(),finishedAt:null,trigger,status:'running',newCount:0,sources:[]};
  await tx.execute({sql:'INSERT INTO scans(id,started_at,body) VALUES(?,?,?)',args:[scan.id,scan.startedAt,JSON.stringify(scan)]});
  await tx.commit();return scan;
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export async function saveSource(db:Client,source:Source,listings:Listing[]|null,now:string){
 const tx=await db.transaction('write');let added=0;
 try{
  if(listings!==null){
   const old=await tx.execute({sql:'SELECT key,first_seen FROM cats WHERE source_id=?',args:[source.id]});
   const seen=new Map(old.rows.map(r=>[String(r.key),String(r.first_seen)]));
   await tx.execute({sql:"UPDATE cats SET availability='not_listed' WHERE source_id=?",args:[source.id]});
   const writes:InStatement[]=[];
   for(const listing of listings){
    const key=source.id+':'+listing.animalId;
    if(!seen.has(key))added++;
    writes.push({sql:`INSERT INTO cats(key,source_id,body,first_seen,last_seen,availability) VALUES(?,?,?,?,?,'listed') ON CONFLICT(key) DO UPDATE SET body=excluded.body,last_seen=excluded.last_seen,availability='listed'`,args:[key,source.id,JSON.stringify(listing),seen.get(key)||now,now]});
   }
   if(writes.length)await tx.batch(writes);
  }else{
   const previous=await tx.execute({sql:'SELECT body FROM sources WHERE id=?',args:[source.id]});
   if(previous.rows[0]){const old=JSON.parse(String(previous.rows[0].body)) as Source;source.lastSuccess=old.lastSuccess;source.count=old.count;}
  }
  await tx.execute({sql:'INSERT INTO sources(id,body) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',args:[source.id,JSON.stringify(source)]});
  await tx.commit();return added;
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export function nextCheck(now=new Date()){
 const d=new Date(now.getTime()-7*3600000);
 for(let offset=0;offset<2;offset++)for(const hour of [8,13,17]){
  const candidate=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+offset,hour+7));
  if(candidate>now)return candidate.toISOString();
 }
 throw new Error('Schedule calculation failed');
}
export async function readStore(db:Client){
 const [cats,sources,runs]=await Promise.all([db.execute('SELECT * FROM cats'),db.execute('SELECT body FROM sources'),db.execute('SELECT body FROM scans ORDER BY started_at DESC LIMIT 50')]);
 return {
  cats:cats.rows.map(r=>({...JSON.parse(String(r.body)),key:r.key,firstSeen:r.first_seen,lastSeen:r.last_seen,availability:r.availability})) as Cat[],
  sources:sources.rows.map(r=>JSON.parse(String(r.body))) as Source[],
  runs:runs.rows.map(r=>{const s=JSON.parse(String(r.body)) as Scan;if(s.status==='running'&&Date.now()-Date.parse(s.startedAt)>120000)s.status='interrupted';return s;})
 };
}
