import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {migrate} from '../server/db';
import {beginScan,releaseScan,saveSource,readStore,nextCheck} from '../server/store';
import {enqueueScan,claimScan} from '../server/jobs';
import type {Listing,Source} from '../src/types';
const source:Source={id:'test',name:'Test',url:'https://example.org',connected:true,status:'checked',count:1,lastSuccess:'2026-09-12T00:00:00Z',message:''};
const cat:Listing={sourceId:'test',animalId:'1',name:'Cat',ageMonths:3,sex:'Female',breed:'Domestic',coat:'Tortoiseshell',confirmation:'confirmed',shelter:'Test',city:'Unknown',location:'Unknown',photo:null,adoptionUrl:'https://example.org/cat',adoptionFee:null,description:''};
test('repeated scans preserve first seen; failures preserve listings; absence is not adoption',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 assert.equal(await saveSource(db,{...source},[cat],'2026-09-10T00:00:00Z'),1);
 assert.equal(await saveSource(db,{...source},[cat],'2026-09-11T00:00:00Z'),0);
 await saveSource(db,{...source,status:'failed',lastSuccess:null},null,'2026-09-12T00:00:00Z');
 let state=await readStore(db);assert.equal(state.cats[0].firstSeen,'2026-09-10T00:00:00Z');assert.equal(state.cats[0].lastSeen,'2026-09-11T00:00:00Z');assert.equal(state.cats[0].availability,'listed');assert.ok(state.sources[0].lastSuccess);
 await saveSource(db,{...source},[],'2026-09-13T00:00:00Z');state=await readStore(db);assert.equal(state.cats[0].availability,'not_listed');db.close();
});
test('database lock prevents overlapping manual and scheduled refresh',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);const now=new Date();assert.ok(await beginScan(db,'manual',now));assert.equal(await beginScan(db,'scheduled',now),null);assert.ok(await beginScan(db,'manual',new Date(+now+300001)));db.close();
});
test('completed scan releases its own lock without releasing a successor lock',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);const now=new Date('2026-09-12T00:00:00Z');
 const first=await beginScan(db,'manual',now);assert.ok(first);
 await releaseScan(db,first!);
 const second=await beginScan(db,'scheduled',new Date(+now+1000));assert.ok(second);
 await releaseScan(db,first!);
 assert.equal(await beginScan(db,'manual',new Date(+now+2000)),null);
 await releaseScan(db,second!);db.close();
});
test('background retry can bypass a crashed scan lock but stale worker cannot save',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 const now=new Date();
 assert.ok(await beginScan(db,'manual',now));
 const job=await enqueueScan(db,'scheduled',+now);assert.ok(job);
 const first=await claimScan(db,job.id,+now+1);assert.ok(first);
 assert.ok(await beginScan(db,'scheduled',new Date(+now+2),{id:job.id,token:first.token}));
 const retry=await claimScan(db,job.id,first.leaseUntil+1);assert.ok(retry);
 await assert.rejects(saveSource(db,{...source},[cat],new Date().toISOString(),source.id,{id:job.id,token:first.token}));
 assert.equal(await saveSource(db,{...source},[cat],new Date().toISOString(),source.id,{id:job.id,token:retry!.token}),1);
 db.close();
});
test('schedule is 8am, 1pm, 5pm Phoenix including UTC day rollover',()=>{
 assert.equal(nextCheck(new Date('2026-09-12T14:59:00Z')),'2026-09-12T15:00:00.000Z');
 assert.equal(nextCheck(new Date('2026-09-12T20:00:00Z')),'2026-09-13T00:00:00.000Z');
 assert.equal(nextCheck(new Date('2026-09-13T00:00:00Z')),'2026-09-13T15:00:00.000Z');
});
test('a listing gaining or losing its published ID preserves identity and first seen',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 const pending={...cat,animalId:'',identityHint:'cat-born-2026-04-10'};
 await saveSource(db,{...source},[pending],'2026-09-10T00:00:00Z');
 assert.equal(await saveSource(db,{...source},[{...pending,animalId:'123'}],'2026-09-11T00:00:00Z'),0);
 assert.equal(await saveSource(db,{...source},[pending],'2026-09-12T00:00:00Z'),0);
 const state=await readStore(db);assert.equal(state.cats.length,1);assert.equal(state.cats[0].firstSeen,'2026-09-10T00:00:00Z');assert.equal(state.cats[0].availability,'listed');db.close();
});
test('reconciling one regional scope does not remove a listing still present in another scope',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 await saveSource(db,{...source},[cat],'2026-09-10T00:00:00Z','phoenix');
 await saveSource(db,{...source},[cat],'2026-09-11T00:00:00Z','tucson');
 await migrate(db);
 await saveSource(db,{...source},[],'2026-09-12T00:00:00Z','phoenix');
 assert.equal((await readStore(db)).cats[0].availability,'listed');
 await saveSource(db,{...source},[],'2026-09-13T00:00:00Z','tucson');
 assert.equal((await readStore(db)).cats[0].availability,'not_listed');
 db.close();
});
