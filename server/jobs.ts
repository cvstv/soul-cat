import type {Client} from '@libsql/client';
export type JobStatus='queued'|'running'|'success'|'partial'|'failed';
export interface ScanJob {id:string;status:JobStatus;trigger:string;createdAt:number;leaseUntil:number|null;}
const LEASE_MS=45_000;
const RETRY_GRACE_MS=180_000;
const fromRow=(r:Record<string,unknown>):ScanJob=>({id:String(r.id),status:String(r.status) as JobStatus,trigger:String(r.trigger),createdAt:Number(r.created_at),leaseUntil:r.lease_until==null?null:Number(r.lease_until)});
export async function enqueueScan(db:Client,trigger:string,now=Date.now()):Promise<ScanJob|null>{
 const tx=await db.transaction('write');
 try{
  await tx.execute({sql:"UPDATE scan_jobs SET status='failed',finished_at=? WHERE (status='queued' AND created_at<?) OR (status='running' AND lease_until<?)",args:[now,now-120000,now-RETRY_GRACE_MS]});
  const active=await tx.execute("SELECT id,trigger,status,created_at,lease_until FROM scan_jobs WHERE status IN ('queued','running') LIMIT 1");
  if(active.rows[0]){await tx.commit();return fromRow(active.rows[0]);}
  const recent=await tx.execute({sql:'SELECT id FROM scan_jobs WHERE created_at>? ORDER BY created_at DESC LIMIT 1',args:[now-300000]});
  if(recent.rows.length){await tx.commit();return null;}
  const id=crypto.randomUUID();
  await tx.execute({sql:"INSERT INTO scan_jobs(id,trigger,status,created_at) VALUES(?,?,'queued',?)",args:[id,trigger,now]});
  await tx.commit();return {id,trigger,status:'queued',createdAt:now,leaseUntil:null};
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export async function claimScan(db:Client,id:string,now=Date.now()):Promise<{token:string;leaseUntil:number}|null>{
 const token=crypto.randomUUID(),leaseUntil=now+LEASE_MS;
 const result=await db.execute({sql:"UPDATE scan_jobs SET status='running',lease_token=?,lease_until=? WHERE id=? AND (status='queued' OR (status='running' AND lease_until<?)) RETURNING id",args:[token,leaseUntil,id,now]});
 return result.rows.length?{token,leaseUntil}:null;
}
export async function renewScanLease(db:Client,id:string,token:string,now=Date.now()):Promise<boolean>{
 const result=await db.execute({sql:"UPDATE scan_jobs SET lease_until=? WHERE id=? AND status='running' AND lease_token=? AND lease_until>=? RETURNING id",args:[now+LEASE_MS,id,token,now]});
 return result.rows.length===1;
}
export async function finishScan(db:Client,id:string,token:string,status:Exclude<JobStatus,'queued'|'running'>,now=Date.now()):Promise<boolean>{
 const result=await db.execute({sql:"UPDATE scan_jobs SET status=?,finished_at=?,lease_until=NULL,lease_token=NULL WHERE id=? AND status='running' AND lease_token=? AND lease_until>=? RETURNING id",args:[status,now,id,token,now]});
 return result.rows.length===1;
}
export async function getScanJob(db:Client,id:string):Promise<ScanJob|null>{
 const result=await db.execute({sql:'SELECT id,trigger,status,created_at,lease_until FROM scan_jobs WHERE id=?',args:[id]});
 return result.rows[0]?fromRow(result.rows[0]):null;
}
export async function getActiveScan(db:Client):Promise<ScanJob|null>{
 const result=await db.execute("SELECT id,trigger,status,created_at,lease_until FROM scan_jobs WHERE status IN ('queued','running') LIMIT 1");
 return result.rows[0]?fromRow(result.rows[0]):null;
}
export async function failQueuedScan(db:Client,id:string):Promise<boolean>{
 const result=await db.execute({sql:"UPDATE scan_jobs SET status='failed',finished_at=? WHERE id=? AND status='queued' RETURNING id",args:[Date.now(),id]});
 return result.rows.length===1;
}
export async function expireStaleScanJobs(db:Client,now=Date.now()):Promise<void>{
 const stale=await db.execute({sql:"SELECT id FROM scan_jobs WHERE (status='queued' AND created_at<?) OR (status='running' AND lease_until<?) LIMIT 1",args:[now-120000,now-RETRY_GRACE_MS]});
 if(!stale.rows.length)return;
 await db.execute({sql:"UPDATE scan_jobs SET status='failed',finished_at=? WHERE (status='queued' AND created_at<?) OR (status='running' AND lease_until<?)",args:[now,now-120000,now-RETRY_GRACE_MS]});
}
export async function getLatestScan(db:Client):Promise<ScanJob|null>{
 const result=await db.execute('SELECT id,trigger,status,created_at,lease_until FROM scan_jobs ORDER BY created_at DESC LIMIT 1');
 return result.rows[0]?fromRow(result.rows[0]):null;
}
