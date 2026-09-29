import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isNetlifyRuntime, scanAllowedHere} from '../server/scan-context';
test('Netlify runtime detection uses the function SITE_ID rather than build-only NETLIFY',()=>{
 assert.equal(isNetlifyRuntime({SITE_ID:'site-id'}),true);
 assert.equal(isNetlifyRuntime({NETLIFY:'true'}),true);
 assert.equal(isNetlifyRuntime({}),false);
});
test('Netlify scans require a production-only runtime setting',()=>{
 assert.equal(scanAllowedHere({SITE_ID:'site-id'}),false);
 assert.equal(scanAllowedHere({SITE_ID:'site-id',CONTEXT:'production'}),false);
 assert.equal(scanAllowedHere({SITE_ID:'site-id',SOULCAT_SCAN_ENABLED:'true'}),true);
 assert.equal(scanAllowedHere({SITE_ID:'site-id',SOULCAT_SCAN_ENABLED:'false'}),false);
 assert.equal(scanAllowedHere({}),true);
});
