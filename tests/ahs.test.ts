import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AHS_SEARCH, collectAhs} from '../server/providers/ahs';

function page(shelterId = 74640, returnedShelters = AHS_SEARCH.shelterIds) {
  const pet = {petId: 123, clanId: 2, adopted: false, isTransport: false, shelterId,
    shelterName: 'Arizona Humane Society - Papago Park Campus', name: 'Mia',
    pdpRoute: 'https://www.adoptapet.com/pet/123-phoenix-arizona-cat',
    color: 'Tortoiseshell', breed: 'Domestic Shorthair', age: '4 mos', sex: 'f',
    address: {city: 'Phoenix', state: 'AZ'}};
  const data = {fingerprint: {name: 'pet-search-results'}, serverMemo: {data: {
    sortOption: 'Newest', adType: 'cat', speciesText: 'cat', page: 1, petTotal: 1, isTotalExact: true,
    petsCollection: [pet], petIds: [123], filters: {postalCode: '85008', radius: 50,
      transport: false, speciesIds: [2], awos: returnedShelters.map(String)},
  }}};
  return `<div wire:initial-data="${JSON.stringify(data).replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></div>`;
}

test('AHS searches all three campuses and retains syndicated identity', async () => {
  const cats = await collectAhs(async url => {
    const q = new URL(url).searchParams;
    assert.equal(q.get('speciesId'), '2');
    assert.deepEqual([q.get('awos[0]'), q.get('awos[1]'), q.get('awos[2]')], ['74640', '74639', '211008']);
    return page();
  });
  assert.equal(cats[0].sourceId, 'ahs');
  assert.equal(cats[0].animalId, '123');
  assert.equal(cats[0].adoptionUrl, 'https://www.adoptapet.com/pet/123-phoenix-arizona-cat');
  assert.equal(cats[0].confirmation, 'confirmed');
  assert.match(cats[0].shelter, /Papago Park/);
});

test('AHS rejects broadened search scope and other shelters', async () => {
  await assert.rejects(collectAhs(async () => page(74640, [])), /scope/);
  await assert.rejects(collectAhs(async () => page(999)), /scope/);
});
