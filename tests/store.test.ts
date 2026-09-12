import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {migrate} from '../server/db';
import {beginScan,saveSource,readStore,nextCheck} from '../server/store';
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
test('schedule is 8am, 1pm, 5pm Phoenix including UTC day rollover',()=>{
 assert.equal(nextCheck(new Date('2026-09-12T14:59:00Z')),'2026-09-12T15:00:00.000Z');
 assert.equal(nextCheck(new Date('2026-09-12T20:00:00Z')),'2026-09-13T00:00:00.000Z');
 assert.equal(nextCheck(new Date('2026-09-13T00:00:00Z')),'2026-09-13T15:00:00.000Z');
});
