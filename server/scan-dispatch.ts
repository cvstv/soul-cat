import {database,migrate} from './db';
import {enqueueScan,claimScan,finishScan,getScanJob,failQueuedScan} from './jobs';
import {refresh} from './collector';
import {signJob} from './worker-auth';

function workerSecret(){return process.env.SCAN_WORKER_SECRET||process.env.TURSO_AUTH_TOKEN||'';}
export async function runScanJob(id:string){
 const db=database();await migrate(db);
 const claim=await claimScan(db,id);if(!claim)return;
 const job=await getScanJob(db,id);
 try{
  const result=await refresh(job?.trigger||'scheduled');
  await finishScan(db,id,claim.token,result?result.status as 'success'|'partial'|'failed':'failed');
 }catch(e){
  console.error('Soul Cat scan worker failed:',e instanceof Error?e.name:'Error');
  await finishScan(db,id,claim.token,'failed');
 }
}
export async function dispatchScan(trigger:'manual'|'scheduled'){
 const db=database();await migrate(db);
 const job=await enqueueScan(db,trigger);
 if(!job)return null;
 if(process.env.NETLIFY){
  try{
   const site=process.env.URL,secret=workerSecret();
   if(!site||!secret)throw new Error('Background worker URL or secret is not configured');
   const response=await fetch(new URL('/.netlify/functions/scan-worker',site),{method:'POST',headers:{'content-type':'application/json','x-soulcat-signature':signJob(job.id,secret)},body:JSON.stringify({id:job.id}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error(`Background worker dispatch failed: HTTP ${response.status}`);
  }catch(e){await failQueuedScan(db,job.id);throw e;}
 }else{
  setImmediate(()=>void runScanJob(job.id));
 }
 return job;
}
