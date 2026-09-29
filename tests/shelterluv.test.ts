import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseShelterluv} from '../server/providers/shelterluv';

const org={id:'hermitage',name:'Hermitage No-Kill Cat Shelter',url:'https://www.hermitagecatshelter.org/adopt/',shelterId:38723,prefix:'HERM',city:'Tucson'};
const animal={nid:11,uniqueId:'HERM-A-27',name:'Silly Me',species:'Cat',adoptable:1,sex:'Male',breed:'Domestic Shorthair',primary_color:'Orange',secondary_color:null,birthday:'1648237930',location:'Adoptions Lobby',campus:'Main Campus',photos:[{url:'https://new-s3.shelterluv.com/photo.jpg',isCover:true}],public_url:'https://www.shelterluv.com/embed/animal/HERM-A-27'};
test('shared Shelterluv parser preserves published identity and link without inventing a city',()=>{
 const cats=parseShelterluv(JSON.stringify({animals:[animal],show:{}}),org,new Date('2026-09-27T00:00:00Z'));
 assert.equal(cats.length,1);
 assert.deepEqual({id:cats[0].animalId,url:cats[0].adoptionUrl,city:cats[0].city,location:cats[0].location,breed:cats[0].breed},
  {id:'HERM-A-27',url:'https://www.shelterluv.com/embed/animal/HERM-A-27',city:'Unknown',location:'Adoptions Lobby',breed:'Domestic Shorthair'});
 assert.equal(cats[0].sourceId,'hermitage');
 assert.equal(cats[0].sourceCity,'Tucson');
 assert.equal(cats[0].photo,'https://new-s3.shelterluv.com/photo.jpg');
});
test('Shelterluv parser rejects malformed, duplicate, mismatched and unsafe records as incomplete',()=>{
 const feed=(animals:unknown[])=>JSON.stringify({animals,show:{}});
 assert.throws(()=>parseShelterluv('Access Denied',org));
 assert.throws(()=>parseShelterluv(feed([animal,animal]),org));
 assert.throws(()=>parseShelterluv(feed([{...animal,uniqueId:'OTHER-A-27'}]),org));
 assert.throws(()=>parseShelterluv(feed([{...animal,public_url:'https://example.com/not-the-cat'}]),org));
 assert.deepEqual(parseShelterluv(feed([]),org),[]);
});
test('Shelterluv parser excludes noncats but rejects missing species',()=>{
 const feed=(animals:unknown[])=>JSON.stringify({animals,show:{}});
 assert.deepEqual(parseShelterluv(feed([{...animal,species:'Dog'}]),org),[]);
 assert.throws(()=>parseShelterluv(feed([{...animal,species:null}]),org));
});
