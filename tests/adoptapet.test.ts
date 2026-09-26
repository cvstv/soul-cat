import test from 'node:test';
import assert from 'node:assert/strict';
import { collectAdoptapetSearch, parseAdoptapetPage, adoptapetUrl } from '../server/providers/adoptapet.js';
const options = { sourceId:'adopt-a-pet',sourceName:'Adopt a Pet',postalCode:'85003' };
function fixture(page=1,total=1, mutate:(d:any)=>void=()=>{}) {
  const pets = Array.from({length:Math.min(42,Math.max(0,total-(page-1)*42))},(_,i)=>({petId:(page-1)*42+i+100,clanId:2,adopted:false,isTransport:false,name:'Tess',pdpRoute:`https://www.adoptapet.com/pet/${(page-1)*42+i+100}-phoenix-arizona-cat`,age:'2 yrs 3 mos',sex:'f',breed:'Domestic Shorthair',color:'Tortoiseshell',shelterName:'Shelter',shelterId:123,address:{city:'Phoenix',state:'AZ',line1:'PRIVATE'},description:'<p>Sweet</p>',contactEmail:'PRIVATE',photoUrl:'https://pet-uploads.adoptapet.com/cat.jpg'}));
  const d={sortOption:'Newest',adType:'cat',speciesText:'cat',page,petTotal:total,isTotalExact:true,petsCollection:pets,petIds:pets.map(p=>p.petId),filters:{transport:false,speciesIds:[2],radius:50,postalCode:'85003'}};mutate(d);
  return `<div wire:initial-data="${JSON.stringify({fingerprint:{name:'pet-search-results'},serverMemo:{data:d}}).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></div>`;
}
test('Adopt a Pet whitelists public fields and uses exact cat profile identity',()=>{
  const cat=parseAdoptapetPage(fixture()).cats[0]; assert.equal(cat.animalId,'100');assert.equal(cat.ageMonths,27);assert.equal(cat.confirmation,'confirmed');assert.equal(cat.city,'Phoenix');assert.equal(cat.description,'Sweet');assert.ok(!JSON.stringify(cat).includes('PRIVATE'));
  assert.equal(new URL(adoptapetUrl()).searchParams.get('speciesId'),'2');
});
test('Adopt a Pet rejects samples, scope drift, malformed URLs, duplicates and incomplete pages',()=>{
  assert.throws(()=>parseAdoptapetPage('<a href="/pet/100-cat">Sample</a>'));
  for(const mutate of [(d:any)=>d.isTotalExact=false,(d:any)=>d.filters.transport=true,(d:any)=>d.filters.postalCode='90210',(d:any)=>d.petsCollection[0].pdpRoute='https://evil.test/pet/100-cat',(d:any)=>d.petsCollection[0].clanId=1,(d:any)=>d.petsCollection.pop(),(d:any)=>d.petIds[0]=999]) assert.throws(()=>parseAdoptapetPage(fixture(1,1,mutate)));
  assert.deepEqual(parseAdoptapetPage(fixture(1,0)).cats,[]);
});
test('Adopt a Pet verifies all pages and totals before excluding overlapping sources',async()=>{
  const calls:string[]=[];const cats=await collectAdoptapetSearch({...options,excludeShelterIds:[123]},async url=>{calls.push(url);return fixture(Number(new URL(url).searchParams.get('page')),85);});assert.equal(cats.length,0);assert.equal(calls.length,3);
  assert.equal((await collectAdoptapetSearch(options,async url=>fixture(Number(new URL(url).searchParams.get('page')),85))).length,85);
  await assert.rejects(collectAdoptapetSearch(options,async url=>fixture(Number(new URL(url).searchParams.get('page')),new URL(url).searchParams.get('page')==='1'?85:86)),/changed/);
  await assert.rejects(collectAdoptapetSearch(options,async()=>fixture(1,85)),/scope/);
});
test('Adopt a Pet shelter scope must match request and every returned card',()=>{
  const scoped={...options,shelterIds:[123]}; assert.equal(parseAdoptapetPage(fixture(1,1,d=>d.filters.awos=['123']),1,scoped).cats.length,1);
  assert.throws(()=>parseAdoptapetPage(fixture(),1,scoped));assert.throws(()=>parseAdoptapetPage(fixture(1,1,d=>d.filters.awos=['999']),1,scoped));
});
