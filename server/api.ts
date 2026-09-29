import {inventory} from './collector';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handle(req:Request){
 const path=new URL(req.url).pathname;
 try{
  if(path==='/api/inventory'&&req.method==='GET')return json(await inventory());
  return json({error:'Not found'},404);
 }catch(e){console.error('Soul Cat request failed:',e instanceof Error?e.name:'Error');return json({error:'The service is unavailable. Check deployment database configuration and logs.'},503);}
}
