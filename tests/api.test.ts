import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../server/api';
import {config} from '../netlify/functions/api';

test('visitors can read inventory but cannot trigger a source scan',async()=>{
 const response=await handle(new Request('http://localhost/api/refresh',{method:'POST',headers:{origin:'http://localhost'}}));
 assert.equal(response.status,404);
 assert.deepEqual(config.path,['/api/inventory']);
});
