import type {Client, InStatement} from '@libsql/client';
import type {Cat,Listing,Scan,Source} from '../src/types';
export interface ScanFence {id:string;token:string}
export async function beginScan(db:Client,trigger:string,now=new Date(),fence?:ScanFence):Promise<Scan|null>{
 const tx=await db.transaction('write');
 try{
  if(fence){
   const lease=await tx.execute({sql:"SELECT id FROM scan_jobs WHERE id=? AND status='running' AND lease_token=? AND lease_until>=?",args:[fence.id,fence.token,now.getTime()]});
   if(!lease.rows.length){await tx.rollback();return null;}
  }else{
   const lock=await tx.execute({sql:`INSERT INTO locks(name,expires) VALUES('scan',?) ON CONFLICT(name) DO UPDATE SET expires=excluded.expires WHERE locks.expires<=? RETURNING name`,args:[now.getTime()+300000,now.getTime()]});
   if(!lock.rows.length){await tx.rollback();return null;}
  }
  const scan:Scan={id:crypto.randomUUID(),startedAt:now.toISOString(),finishedAt:null,trigger,status:'running',newCount:0,sources:[]};
  await tx.execute({sql:'INSERT INTO scans(id,started_at,body) VALUES(?,?,?)',args:[scan.id,scan.startedAt,JSON.stringify(scan)]});
  await tx.commit();return scan;
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export async function releaseScan(db:Client,run:Scan):Promise<void>{
 await db.execute({sql:"DELETE FROM locks WHERE name='scan' AND expires=?",args:[Date.parse(run.startedAt)+300000]});
}
export async function saveSource(db:Client,source:Source,listings:Listing[]|null,now:string,scopeId=source.id,fence?:ScanFence){
 const tx=await db.transaction('write');let added=0;
 try{
  if(fence){
   const lease=await tx.execute({sql:"SELECT id FROM scan_jobs WHERE id=? AND status='running' AND lease_token=? AND lease_until>=?",args:[fence.id,fence.token,Date.now()]});
   if(!lease.rows.length)throw new Error('Scan worker lost its job lease');
  }
  if(listings!==null){
   const old=await tx.execute({sql:'SELECT key,first_seen,body FROM cats WHERE source_id=?',args:[source.id]});
   const seen=new Map(old.rows.map(r=>[String(r.key),String(r.first_seen)]));
   const writes:InStatement[]=[];
   const keys=new Set<string>();
   for(const listing of listings){
    if(listing.sourceId!==source.id)throw new Error('Listing source does not match collection source');
    if(!listing.animalId&&!listing.identityHint)throw new Error('Missing listing identity');
    let key=source.id+':'+(listing.animalId||'unpublished:'+listing.identityHint);
    if(listing.identityHint){
     const matches=old.rows.filter(r=>{const prior=JSON.parse(String(r.body)) as Listing;return prior.identityHint===listing.identityHint&&(!prior.animalId||!listing.animalId||prior.animalId===listing.animalId);});
     if(matches.length===1&&!seen.has(key)&&listings.filter(c=>c.identityHint===listing.identityHint).length===1)key=String(matches[0].key);
    }
    if(keys.has(key))throw new Error('Duplicate listing identity in completed scope');
    keys.add(key);
    if(!seen.has(key))added++;
    writes.push({sql:`INSERT INTO cats(key,source_id,body,first_seen,last_seen,availability) VALUES(?,?,?,?,?,'listed') ON CONFLICT(key) DO UPDATE SET body=excluded.body,last_seen=excluded.last_seen,availability='listed'`,args:[key,source.id,JSON.stringify(listing),seen.get(key)||now,now]});
   }
   if(writes.length)await tx.batch(writes);
   await tx.execute({sql:'DELETE FROM scope_memberships WHERE scope_id=?',args:[scopeId]});
   if(keys.size)await tx.batch([...keys].map(key=>({sql:'INSERT INTO scope_memberships(scope_id,key,last_seen) VALUES(?,?,?)',args:[scopeId,key,now]})));
   await tx.execute({sql:"UPDATE cats SET availability='not_listed' WHERE source_id=? AND availability='listed' AND NOT EXISTS (SELECT 1 FROM scope_memberships m WHERE m.key=cats.key)",args:[source.id]});
  }else{
   const previous=await tx.execute({sql:'SELECT body FROM sources WHERE id=?',args:[source.id]});
   if(previous.rows[0]){const old=JSON.parse(String(previous.rows[0].body)) as Source;source.lastSuccess=old.lastSuccess;source.count=old.count;}
  }
  await tx.execute({sql:'INSERT INTO sources(id,body) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',args:[source.id,JSON.stringify(source)]});
  if(fence){
   const lease=await tx.execute({sql:"SELECT id FROM scan_jobs WHERE id=? AND status='running' AND lease_token=? AND lease_until>=?",args:[fence.id,fence.token,Date.now()]});
   if(!lease.rows.length)throw new Error('Scan worker lost its job lease');
  }
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
