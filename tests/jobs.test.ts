import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {migrate} from '../server/db';
import {enqueueScan,claimScan,finishScan,getScanJob,getLatestScan,failQueuedScan,expireStaleScanJobs} from '../server/jobs';

test('duplicate dispatch joins one durable job and only one worker can claim it',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 const first=await enqueueScan(db,'manual',1000);
 const second=await enqueueScan(db,'scheduled',1001);
 assert.ok(first);assert.ok(second);
 assert.equal(first.id,second.id);
 const worker=await claimScan(db,first.id,1002);
 assert.ok(worker);
 assert.equal(await claimScan(db,first.id,1003),null);
 assert.equal((await getScanJob(db,first.id))?.status,'running');
 assert.equal(await finishScan(db,first.id,worker!.token,'success',1004),true);
 assert.equal((await getScanJob(db,first.id))?.status,'success');
 db.close();
});
test('expired lease can be reclaimed and old worker cannot publish completion',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 const job=await enqueueScan(db,'manual',1000);
 assert.ok(job);const old=await claimScan(db,job.id,1001);assert.ok(old);
 const next=await claimScan(db,job.id,old!.leaseUntil+1);assert.ok(next);
 assert.notEqual(next!.token,old!.token);
 assert.equal(await finishScan(db,job.id,old!.token,'success',next!.leaseUntil-1),false);
 assert.equal(await finishScan(db,job.id,next!.token,'failed',next!.leaseUntil-1),true);
 assert.equal((await getScanJob(db,job.id))?.status,'failed');
 db.close();
});
test('completed scan enforces a shared cooldown before another public scan',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 const job=await enqueueScan(db,'manual',1000);assert.ok(job);
 const worker=await claimScan(db,job!.id,1001);assert.ok(worker);
 await finishScan(db,job!.id,worker!.token,'success',1002);
 assert.equal(await enqueueScan(db,'manual',1000+299999),null);
 assert.ok(await enqueueScan(db,'scheduled',1000+300001));
 db.close();
});
test('dispatch failure closes an unclaimed job without clobbering a running worker',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 const job=await enqueueScan(db,'manual',1000);assert.ok(job);
 assert.equal(await failQueuedScan(db,job.id),true);
 assert.equal((await getScanJob(db,job.id))?.status,'failed');
 const next=await enqueueScan(db,'scheduled',301001);assert.ok(next);
 const claim=await claimScan(db,next.id,301002);assert.ok(claim);
 assert.equal(await failQueuedScan(db,next.id),false);
 assert.equal((await getScanJob(db,next.id))?.status,'running');
 db.close();
});
test('stale queued jobs become failed so the UI can stop polling',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 const job=await enqueueScan(db,'manual',1000);assert.ok(job);
 await expireStaleScanJobs(db,1000+120001);
 assert.equal((await getScanJob(db,job.id))?.status,'failed');
 db.close();
});
test('latest job remains visible after it finishes',async()=>{
 const db=createClient({url:'file::memory:'});await migrate(db);
 const job=await enqueueScan(db,'manual',1000);assert.ok(job);
 const worker=await claimScan(db,job.id,1001);assert.ok(worker);
 await finishScan(db,job.id,worker.token,'partial',1002);
 assert.deepEqual({id:(await getLatestScan(db))?.id,status:(await getLatestScan(db))?.status},{id:job.id,status:'partial'});
 db.close();
});
