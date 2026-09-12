import {database,migrate} from './db';
import {beginScan,saveSource,readStore,nextCheck} from './store';
import {registry} from './providers/index';
import type {Inventory,Source} from '../src/types';
export async function refresh(trigger='manual'){
 const db=database();await migrate(db);
 const run=await beginScan(db,trigger);if(!run)return null;
 try{
  // Fetch concurrently, then persist sequentially to avoid competing SQLite transactions.
  const observations=await Promise.all(registry.filter(s=>s.connected&&s.collect).map(async s=>{
   const source:Source={id:s.id,name:s.name,url:s.url,connected:true,status:'checked',count:0,lastSuccess:null,message:''};
   try{const cats=await s.collect!();source.count=cats.length;source.lastSuccess=new Date().toISOString();source.message=`Read ${cats.length} listings`;return {source,cats};}
   catch{source.status='failed';source.message='Source could not be read. Previous listings retained; check the shelter directly.';return {source,cats:null};}
  }));
  for(const o of observations){run.newCount+=await saveSource(db,o.source,o.cats,new Date().toISOString());run.sources.push(o.source);}
  const successes=observations.filter(o=>o.cats!==null).length;
  run.status=successes===observations.length&&successes>0?'success':successes?'partial':'failed';
 }catch(e){run.status='failed';throw e;}
 finally{
  run.finishedAt=new Date().toISOString();
  await db.execute({sql:'UPDATE scans SET body=? WHERE id=?',args:[JSON.stringify(run),run.id]});
  await db.execute("DELETE FROM scans WHERE id NOT IN (SELECT id FROM scans ORDER BY started_at DESC LIMIT 100)");
 }
 return run;
}
export async function inventory():Promise<Inventory>{
 const db=database();await migrate(db);const data=await readStore(db);
 const sources:Source[]=registry.map(s=>data.sources.find(o=>o.id===s.id)||{id:s.id,name:s.name,url:s.url,connected:s.connected,status:s.connected?'not_checked':'not_connected',count:0,lastSuccess:null,message:s.reason||'Not checked yet'});
 return {...data,sources,nextCheck:nextCheck(),lastSuccess:data.runs.find(r=>r.status==='success')?.finishedAt||null};
}
