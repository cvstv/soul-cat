import {inventory} from './collector';
import {dispatchScan} from './scan-dispatch';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handle(req:Request){
 const path=new URL(req.url).pathname;
 try{
  if(path==='/api/inventory'&&req.method==='GET')return json(await inventory());
  if(path==='/api/refresh'&&req.method==='POST'){
   if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Refresh requires a same-origin request.'},403);
   if(process.env.PUBLIC_REFRESH_ENABLED==='false')return json({error:'Manual refresh is disabled on this deployment.'},403);
   const job=await dispatchScan('manual');
   return job?json({jobId:job.id,status:job.status},202):json({error:'A shared scan was requested recently. Please wait five minutes before starting another.'},429);
  }
  return json({error:'Not found'},404);
 }catch(e){console.error('Soul Cat request failed:',e instanceof Error?e.name:'Error');return json({error:'The service is unavailable. Check deployment database configuration and logs.'},503);}
}
