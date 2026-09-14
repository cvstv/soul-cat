import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseKneading} from '../server/providers/kneading';
const row=(id:number,name:string)=>`<tr id="pet${id}"><td><div id="rgtkSearchPetInfoAnimalName"><span class="rgtkSearchPetInfoTitle">Name:</span>${name}</div><div id="rgtkSearchPetInfoAnimalBreed">Tabby</div><div id="rgtkSearchPetInfoAnimalAgeString">3 Months</div><div id="rgtkSearchPetInfoAnimalAdoptionFee">150</div></td></tr>`;
const feed=(n:number,rows:string)=>`<div class="rgtkSearchFoundSummary">${n} pets found</div><table class="rgtkSearchResultsTable">${rows}</table>`;
test('Kneading feed excludes generic application placeholder and uses exact widget share links',()=>{
 const cats=parseKneading(feed(2,row(1,'A Cat (generic cat selection)')+row(22707969,'Alice')));assert.equal(cats.length,1);assert.equal(cats[0].name,'Alice');assert.equal(cats[0].ageMonths,3);assert.equal(cats[0].adoptionFee,'150');assert.equal(cats[0].adoptionUrl,'https://toolkit.rescuegroups.org/j/3/pet?a=22707969&k=7816');
});
test('Kneading rejects partial feeds and accepts explicit zero',()=>{assert.throws(()=>parseKneading(feed(2,row(1,'Alice'))));assert.throws(()=>parseKneading('blocked'));assert.deepEqual(parseKneading(feed(0,'')),[]);});
