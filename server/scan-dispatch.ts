import {database,migrate} from './db';
import {enqueueScan,claimScan,renewScanLease,finishScan,getScanJob,failQueuedScan} from './jobs';
import {refresh} from './collector';
import {signJob} from './worker-auth';
import {isNetlifyRuntime,scanAllowedHere} from './scan-context';

function workerSecret(){return process.env.SCAN_WORKER_SECRET||process.env.TURSO_AUTH_TOKEN||'';}
export async function runScanJob(id:string){
 const db=database();await migrate(db);
 const claim=await claimScan(db,id);if(!claim)return;
 const job=await getScanJob(db,id);
 let stopped=false,leaseLost=false,timer:NodeJS.Timeout|undefined;
 const heartbeat=async()=>{
  if(stopped)return;
  try{if(!await renewScanLease(db,id,claim.token))leaseLost=true;}
  catch{leaseLost=true;console.error('Soul Cat scan lease heartbeat failed');}
  if(!stopped&&!leaseLost)timer=setTimeout(()=>void heartbeat(),15000);
 };
 timer=setTimeout(()=>void heartbeat(),15000);
 try{
  const result=await refresh(job?.trigger||'scheduled',()=>!leaseLost,{id,token:claim.token});
  await finishScan(db,id,claim.token,result?result.status as 'success'|'partial'|'failed':'failed');
 }catch(e){
  console.error('Soul Cat scan worker failed:',e instanceof Error?e.name:'Error');
  await finishScan(db,id,claim.token,'failed');
 }finally{
  stopped=true;clearTimeout(timer);
 }
}
export async function dispatchScan(trigger:'manual'|'scheduled'){
 if(!scanAllowedHere(process.env))throw new Error('Scans are disabled outside the production deployment');
 const db=database();await migrate(db);
 const job=await enqueueScan(db,trigger);
 if(!job)return null;
 if(isNetlifyRuntime(process.env)){
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
