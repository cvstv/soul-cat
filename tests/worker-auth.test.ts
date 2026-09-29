import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signJob,verifyJobSignature} from '../server/worker-auth';
test('background worker accepts only a matching signed job ID',()=>{
 const id='53dbccbc-bf11-4dfa-8a38-26c748cc90d6',secret='a-server-only-secret';
 const signature=signJob(id,secret);
 assert.equal(verifyJobSignature(id,signature,secret),true);
 assert.equal(verifyJobSignature('43dbccbc-bf11-4dfa-8a38-26c748cc90d6',signature,secret),false);
 assert.equal(verifyJobSignature(id,'invalid',secret),false);
 assert.throws(()=>signJob(id,''));
});
