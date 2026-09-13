import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,filterCats,readFilters,writeFilters,ageLabel} from '../src/search';
import type {Cat} from '../src/types';
const cat=(key:string,ageMonths:number|null,other:Partial<Cat>={}):Cat=>({key,sourceId:'halo',animalId:key,name:key,ageMonths,sex:'Female/Spayed',breed:'Domestic short hair',coat:'Tortoiseshell',confirmation:'confirmed',shelter:'HALO',city:'Phoenix',location:'Phoenix',photo:null,adoptionUrl:'https://example.org',adoptionFee:null,description:'Enjoys sunny windows',firstSeen:'2026-09-12T00:00:00Z',lastSeen:'2026-09-12T00:00:00Z',availability:'listed',...other});
test('age bands have exact boundaries; unknown ages are explicitly optional',()=>{
 const cats=[cat('a',11),cat('b',12),cat('c',35),cat('d',36),cat('e',119),cat('f',120),cat('g',null)];
 assert.deepEqual(filterCats(cats,{...defaults,age:'young',unknownAge:false},new Set()).map(c=>c.key),['b','c']);
 assert.equal(filterCats(cats,{...defaults,age:'kitten'},new Set()).length,2);
 assert.deepEqual(filterCats(cats,{...defaults,age:'senior',unknownAge:false},new Set()).map(c=>c.key),['f']);
});
test('general keyword, breed, source, sex and coat filters compose, including tortie alias',()=>{
 const cats=[cat('Mira',3),cat('Rex',5,{sourceId:'other',coat:'Tabby'})];
 assert.equal(filterCats(cats,{...defaults,q:'sunny tortie',sex:'female',city:'Phoenix',source:'halo',breed:'short'},new Set())[0]?.name,'Mira');
 assert.equal(filterCats(cats,{...defaults,coat:'tabby'},new Set())[0]?.name,'Rex');
});
test('saved filters do not override availability; sorting places unknown ages last',()=>{
 const cats=[cat('a',null),cat('b',5),cat('c',10,{availability:'not_listed'})];
 assert.deepEqual(filterCats(cats,{...defaults,sort:'oldest'},new Set()).map(c=>c.key),['b','a']);
 assert.equal(filterCats(cats,{...defaults,savedOnly:true},new Set(['c'])).length,0);
 assert.equal(filterCats(cats,{...defaults,savedOnly:true,includeMissing:true},new Set(['c'])).length,1);
});
test('shareable search round trips and excludes local saved-only preference',()=>{
 const f={...defaults,q:'black & white',coat:'tuxedo',age:'adult',savedOnly:true,unknownAge:false};
 assert.deepEqual(readFilters(writeFilters(f)),{...f,savedOnly:false});
 assert.equal(readFilters('?sort=invalid&age=invalid&sex=invalid').sort,'newest');
 assert.equal(readFilters('?sort=invalid&age=invalid&sex=invalid').age,'');
 assert.equal(ageLabel(.4),'Under 1 month');assert.equal(ageLabel(null),'Age not listed');assert.equal(ageLabel(26.8),'2 years, 2 mo');
});
