import type {Config} from '@netlify/functions';
import {runScanJob} from '../../server/scan-dispatch';
import {verifyJobSignature} from '../../server/worker-auth';
export default async(req:Request)=>{
 if(req.method!=='POST')return new Response(null,{status:405});
 const body=await req.json().catch(()=>null);
 const id=body&&typeof body.id==='string'?body.id:'';
 const secret=process.env.SCAN_WORKER_SECRET||process.env.TURSO_AUTH_TOKEN||'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!verifyJobSignature(id,req.headers.get('x-soulcat-signature')||'',secret))return new Response(null,{status:403});
 await runScanJob(id);
 return new Response(null,{status:204});
};
export const config:Config={background:true};
