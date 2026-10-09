const test = require('node:test');
const assert = require('node:assert/strict');
const { careSearchUrl } = require('../src/features/care/maps-search.ts');

test('nearby care searches share only rounded coordinates or encoded area text', () => {
  const near = new URL(careSearchUrl('hospitals', { latitude: 14.567891, longitude: 121.123456 }));
  assert.equal(near.origin, 'https://www.google.com');
  assert.equal(near.searchParams.get('api'), '1');
  assert.equal(near.searchParams.get('query'), 'hospitals near 14.568,121.123');
  const manual = new URL(careSearchUrl('clinics', '  City & District #1  '));
  assert.equal(manual.searchParams.get('query'), 'clinics near City & District #1');
  assert.equal([...manual.searchParams].length, 2);
  for (const invalid of ['', ' '.repeat(5), 'a'.repeat(161), { latitude: NaN, longitude: 0 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 181 }]) {
    assert.throws(() => careSearchUrl('clinics', invalid));
  }
  assert.throws(() => careSearchUrl('untrusted category', 'City'));
});
