import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMcacc, mcaccGridUrl, parseMcaccDetail, parseMcaccGrid } from '../server/providers/phoenix.js';

const card = (id = 'A1234567') => `<li class="dogCard"><a onclick="ShowDetailsForAnimal('${id}')"><div class="img-gradient"><img src="https://apps.pets.maricopa.gov/cat.jpg"></div><span class="searchPetTitleSpan">Tess</span><div class="searchPetInfoAgeSex"><span>2 years 3 months</span><span>Female</span></div></a></li>`;
const grid = (body = card(), total = 1, next = '') => `<span class="searchCountLabel">${total} Found</span><ul id="mainGrid">${body}</ul>${next}`;
const box = (label: string, value: string) => `<div class="detailInfoBox"><p>${label}<span>${value}</span></p></div>`;
const detail = (id = 'A1234567') => `<div class="basicPetInfo">${box('Animal ID', id)}${box('Name', 'Tess')}${box('Breed', 'TORTOISESHELL DOMESTIC SH')}${box('Age', '2 years 3 months')}${box('Sex', 'Female')}${box('Location', 'PETCO575')}${box('Adoption fee', '$50')}</div><div class="aboutMeRow">${box('About me', 'Friendly cat, previously lived in Mesa.')}</div><table>Private intake text should not persist</table>`;

test('county request is explicitly cat-only with all availability filters disabled', () => {
  const u = new URL(mcaccGridUrl(2));
  assert.equal(u.searchParams.get('animalTypeFilter'), 'Cat');
  assert.equal(u.searchParams.get('pageNumber'), '2');
  assert.equal(u.searchParams.get('isReadyToday'), 'false');
});
test('county cards map identity, exact share URL, sex and age', () => {
  const { cats, total, next } = parseMcaccGrid(grid());
  assert.equal(total, 1); assert.equal(next, null);
  assert.equal(cats[0].animalId, 'A1234567'); assert.equal(cats[0].ageMonths, 27);
  assert.equal(cats[0].adoptionUrl, 'https://apps.pets.maricopa.gov/adoptPets/Home/Details/A1234567');
  assert.equal(cats[0].sex, 'Female');
});
test('county distinguishes verified zero from challenge, malformed and partial pages', () => {
  assert.deepEqual(parseMcaccGrid(grid('', 0)).cats, []);
  assert.throws(() => parseMcaccGrid('<title>Attention Required</title>'));
  assert.throws(() => parseMcaccGrid(grid('', 3)));
  assert.throws(() => parseMcaccGrid(grid(card() + card(), 2)));
  assert.throws(() => parseMcaccGrid(grid(card().replace('A1234567', '../x'))));
});
test('county detail fields are whitelisted and location does not infer from biography', () => {
  const cat = parseMcaccDetail(detail(), parseMcaccGrid(grid()).cats[0]);
  assert.equal(cat.confirmation, 'confirmed'); assert.equal(cat.location, 'PETCO575');
  assert.equal(cat.city, 'Unknown'); assert.equal(cat.adoptionFee, '$50');
  assert.equal(cat.description, 'Friendly cat, previously lived in Mesa.');
  assert.ok(!JSON.stringify(cat).includes('Private intake'));
  assert.throws(() => parseMcaccDetail(detail('A9999999'), cat));
});
test('county excludes inline image payloads from persisted listings', () => {
  const raw = grid().replace('https://apps.pets.maricopa.gov/cat.jpg', 'data:image/jpeg;base64,/9j/2Q==');
  const cat = parseMcaccGrid(raw).cats[0];
  assert.equal(cat.photo, null);
  assert.equal(parseMcaccDetail(detail(), cat).photo, null);
});
test('county collector verifies pagination, total and individual detail identity', async () => {
  const calls: string[] = [];
  const cats = await collectMcacc(async url => {
    calls.push(url);
    if (url.includes('/Details/')) return detail(url.split('/').pop());
    return new URL(url).searchParams.get('pageNumber') === '0' ? grid(card(), 2, '<button onclick="LoadAnimalGrid(0+1)">Next</button>') : grid(card('A1234568'), 2);
  });
  assert.equal(cats.length, 2); assert.equal(calls.length, 4);
  await assert.rejects(collectMcacc(async () => grid(card(), 2)), /incomplete/);
  await assert.rejects(collectMcacc(async () => grid(card(), 2, '<button onclick="LoadAnimalGrid(0+1)">Next</button>')), /pagination changed/);
  assert.deepEqual(await collectMcacc(async () => grid('', 0)), []);
});
