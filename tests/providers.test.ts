import test from 'node:test';
import assert from 'node:assert/strict';
import { cityFromLocation, ageMonths, ageFromDob, parseSavingOneLife, parseFriendsForLife, parseLostOurHome, parsePetango, safeUrl } from '../server/providers/parsers.js';
import { registry } from '../server/providers/index.js';
import { fetchPublicText, MAX_BYTES } from '../server/providers/transport.js';
const sol = (breed: string, id: number) => `<div class="picture-item species-cat"><div class="picture-item__glyph"><img src="https://cdn.rescuegroups.org/6810/pictures/animals/22770/${id}/photo.jpg"></div><div class="picture-item__title">Peach</div><p class="item__breed-tag">${breed}</p><div class="my-pet-attributes"><span>Cat</span><span>Baby</span><span>Female</span></div><pre class="pf-description">Approximate DOB: 4/10/2026 | Playful kitten.</pre></div>`;
const petango = (species = 'Cat') => `<div class="list-item"><div class="list-animal-name"><a href="javascript:poptastic('wsAdoptableAnimalDetails2.aspx?id=123&PopUp=true');">Peach</a></div><div class="list-animal-id">123</div><div class="list-animal-species">${species}</div><div class="list-animal-sexSN">Female/Spayed</div><div class="list-animal-breed">Domestic Shorthair/Mix</div><div class="list-animal-age">1 year 3 months</div><img class="list-animal-photo" src="https://g.petango.com/photos/1/test.jpg"></div>`;
const asm = (rows: unknown[]) => `/* script wrapper */ (function(){ var adoptables = ${JSON.stringify(rows)}; throw new Error('must never execute'); })();`;
const asmCat = { ID: 123, SPECIESNAME: 'Cat', ANIMALNAME: 'Peach', BREEDNAME: 'Domestic Short Hair', BASECOLOURNAME: 'Tortoiseshell', SEXNAME: 'Female', ANIMALAGE: '4 months.', DISPLAYLOCATION: 'Foster', WEBSITEMEDIANOTES: '<p>Sweet kitten.</p>', WEBSITEIMAGECOUNT: 1 };

test('SOL collects all cats and confirms only explicit tortie labels', () => {
  const cats = parseSavingOneLife(sol('Domestic Short Hair Tortoiseshell', 123) + sol('Calico', 124) + sol('Torbie', 125), new Date('2026-09-11T12:00:00Z'));
  assert.equal(cats.length, 3); assert.equal(cats[0].confirmation, 'confirmed'); assert.equal(cats[1].confirmation, 'unknown'); assert.equal(cats[2].confirmation, 'unknown');
  assert.equal(cats[0].ageMonths, 5); assert.equal(cats[0].city, 'Unknown'); assert.equal(cats[0].adoptionFee, null);
});
test('known numeric ages parse; broad age groups stay unknown', () => {
  assert.equal(ageMonths('2 years 5 months'), 29); assert.equal(ageMonths('1 yr. 4 mo.'), 16); assert.equal(ageMonths('Baby'), null);
  assert.equal(ageFromDob('DOB: 2/31/2026'), null); assert.equal(ageFromDob('DOB: 9/30/2030', new Date('2026-09-11')), null);
});
test('Petango converts a static popup URL without executing code', () => {
  const [cat] = parsePetango(petango()); assert.equal(cat.ageMonths, 15); assert.equal(cat.confirmation, 'unknown');
  assert.equal(parsePetango(petango().replace('<div class="list-animal-id">123</div>', '')).length, 1);
  assert.equal(new URL(cat.adoptionUrl).searchParams.get('id'), '123'); assert.equal(cat.city, 'Unknown');
  assert.throws(() => parsePetango(petango().replace('id=123', 'id=456')), /link changed/);
});
test('ASM extracts JSON only, filters dogs and persists strictly public whitelisted cat fields', () => {
  const [cat] = parseFriendsForLife(asm([{ ...asmCat, IDENTICHIPNUMBER: 'PRIVATE-CHIP', ORIGINALOWNERID: 999, ANIMALCOMMENTS: 'PRIVATE-REMARK', FUTUREOWNEREMAILADDRESS: 'private@example.test' }, { ID: 4, SPECIESNAME: 'Dog' }]));
  assert.equal(cat.confirmation, 'confirmed'); assert.equal(cat.description, 'Sweet kitten.'); assert.equal(cat.location, 'Foster'); assert.equal(cat.city, 'Unknown');
  assert.doesNotMatch(JSON.stringify(cat), /PRIVATE|999|private@example/); assert.equal(cat.adoptionFee, null);
});
test('ASM handles bracket characters inside JSON strings and rejects executable expressions', () => {
  assert.equal(parseFriendsForLife(asm([{ ...asmCat, ANIMALNAME: 'Peach ]; [ \\"' }])).length, 1);
  assert.throws(() => parseFriendsForLife('var adoptables = [(()=>{throw "bad"})()];'));
  assert.throws(() => parseFriendsForLife('var adoptables = [] + steal();'), /terminator/);
  assert.throws(() => parseFriendsForLife('var adoptables = [{"SPECIESNAME":"Cat"}];'));
});
test('ASM explicit empty array is a verified zero; blanks and changed HTML fail closed', () => {
  assert.deepEqual(parseFriendsForLife('var adoptables = [];'), []);
  for (const parse of [parseSavingOneLife, parsePetango, parseLostOurHome, parseFriendsForLife]) {
    assert.throws(() => parse('')); assert.throws(() => parse('<html>Something changed</html>'));
  }
});
test('Lost Our Home retains available foster status without inventing a city or coat', () => {
  const [cat] = parseLostOurHome(`<div class="animals"><div class="animal"><a class="pic" style="background-image:url('https://new-s3.shelterluv.com/cat.jpg')"></a><h3><a href="animal-info?aid=123">Peach</a></h3><p><strong>Domestic Shorthair</strong><br><strong>Status: </strong>Available in Foster<br>Sex: Female<br>Age: 1 yr. 4 mo.<br></p></div></div>`);
  assert.equal(cat.ageMonths, 16); assert.equal(cat.location, 'Available in Foster'); assert.equal(cat.city, 'Unknown'); assert.equal(cat.confirmation, 'unknown');
  assert.equal(cat.photo, 'https://new-s3.shelterluv.com/cat.jpg'); assert.equal(cat.adoptionUrl, 'https://www.lostourhome.org/adopt-a-pet/animal-info?aid=123');
});
test('URLs reject executable schemes; unconnected sources never expose fake collectors', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null); assert.equal(safeUrl('https://user:pass@example.com'), null);
  assert.ok(registry.some(p => p.connected));
  for (const source of registry.filter(p => p.connected)) assert.equal(typeof source.collect, 'function');
  for (const source of registry.filter(p => !p.connected)) { assert.ok(source.reason); assert.equal(source.collect, undefined); }
});
test('transport rejects unknown origin and rechecks redirects before fetching destinations', async () => {
  const original = globalThis.fetch; const visited: string[] = [];
  globalThis.fetch = (async (url: unknown) => { visited.push(String(url)); return new Response('', { status: 302, headers: { location: 'https://127.0.0.1/private' } }); }) as typeof fetch;
  try {
    await assert.rejects(fetchPublicText('https://evil.example/'), /not allowed/);
    assert.equal(visited.length, 0);
    await assert.rejects(fetchPublicText('https://ws.petango.com/test'), /not allowed/); assert.equal(visited.length, 1);
  } finally { globalThis.fetch = original; }
});
test('transport bounds streamed bytes and reports HTTP errors/challenges/blank bodies', async () => {
  const original = globalThis.fetch;
  try {
    for (const [response, expected] of [
      [new Response('blocked', { status: 403 }), /HTTP 403/],
      [new Response(''), /blank/],
      [new Response('Just a moment...'), /challenge/],
      [new Response('x'.repeat(MAX_BYTES + 1)), /5 MB/],
    ] as const) {
      globalThis.fetch = (async () => response) as typeof fetch;
      await assert.rejects(fetchPublicText('https://ws.petango.com/test'), expected);
    }
  } finally { globalThis.fetch = original; }
});


test('city inference uses only literal location evidence and preserves ambiguous or absent cities', () => {
  assert.equal(cityFromLocation('3227 E. Bell Rd Phoenix,Az 85032'), 'Phoenix');
  assert.equal(cityFromLocation('2901 W. Agua Fria Fwy. Phx. AZ. 85027'), 'Phoenix');
  assert.equal(cityFromLocation('Foster Home'), 'Unknown');
  assert.equal(cityFromLocation('Cat House::Room 2'), 'Unknown');
  assert.equal(cityFromLocation('Foster in Gilbert'), 'Gilbert');
  assert.equal(cityFromLocation('Sun City West adoption center'), 'Sun City West');
  assert.equal(cityFromLocation('Mesa or Chandler'), 'Unknown');
  assert.equal(cityFromLocation('Mesquite'), 'Unknown');
  const ffl = parseFriendsForLife(asm([{ ...asmCat, DISPLAYLOCATION: 'Foster in Tempe' }]));
  assert.equal(ffl[0].city, 'Tempe');
});
test('Petango retains its hidden individual location, including foster unknowns', () => {
  const fixture = (location: string) => petango().replace('<div class="list-animal-name">', `<div class="list-animal-info-block"><div class="hidden">${location}</div></div><div class="list-animal-name">`);
  const [cat] = parsePetango(fixture('3227 E. Bell Rd Phoenix,Az 85032'));
  assert.equal(cat.location, '3227 E. Bell Rd Phoenix,Az 85032'); assert.equal(cat.city, 'Phoenix');
  const [foster] = parsePetango(fixture('Foster Home'));
  assert.equal(foster.location, 'Foster Home'); assert.equal(foster.city, 'Unknown');
});
test('SOL adoption text fragment locates the individual name with safe encoding', () => {
  const [cat] = parseSavingOneLife(sol('Tortoiseshell', 123).replace('>Peach<', '>Peach &amp; Cream-Soda<'));
  assert.equal(cat.adoptionUrl, 'https://www.savingonelife.org/adopt/available/#:~:text=Peach%20%26%20Cream%2DSoda');
});


test('existing individual listing links preserve their source-specific identity', () => {
  const [ffl] = parseFriendsForLife(asm([asmCat]));
  const fflUrl = new URL(ffl.adoptionUrl);
  assert.equal(fflUrl.origin, 'https://us06d.sheltermanager.com');
  assert.equal(fflUrl.searchParams.get('method'), 'animal_view');
  assert.equal(fflUrl.searchParams.get('animalid'), ffl.animalId);
  assert.equal(fflUrl.searchParams.get('account'), 'zp1008');
  for (const [id, shelter] of [['halo', 'HALO Animal Rescue'], ['fearless-kitty', 'Fearless Kitty Rescue']]) {
    const [cat] = parsePetango(petango(), id, shelter);
    const url = new URL(cat.adoptionUrl);
    assert.equal(url.origin, 'https://ws.petango.com');
    assert.equal(url.pathname, '/webservices/adoptablesearch/wsAdoptableAnimalDetails2.aspx');
    assert.equal(url.searchParams.get('id'), cat.animalId);
  }
});
