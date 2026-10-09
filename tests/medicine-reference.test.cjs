const test = require('node:test');
const assert = require('node:assert/strict');
const { medicineCatalog, suggestMedicines, referenceName } = require('../src/features/medicines/reference/catalog.ts');
test('PNF reference normalizes transposed CSV columns and preserves meaningful names', () => {
  assert.equal(medicineCatalog.length, 659);
  assert.equal(medicineCatalog[0].name, 'Abacavir');
  assert.equal(medicineCatalog[0].page, 15);
  assert.equal(referenceName('Acetazolamide (B)'), 'Acetazolamide');
  assert.equal(referenceName('Adenosine (1, 2)'), 'Adenosine');
  assert.equal(referenceName('Example (Sodium) + Other'), 'Example (Sodium) + Other');
});
test('medicine suggestions support prefixes and small typos without inventing replacements', () => {
  assert(suggestMedicines('Amox').some(row => row.name === 'Amoxicillin (as trihydrate)'));
  assert(suggestMedicines('Amoxicilin').some(row => row.name === 'Amoxicillin (as trihydrate)'));
  assert.equal(suggestMedicines('x').length, 0);
  assert.equal(suggestMedicines('unknown made up medicine').length, 0);
  assert(suggestMedicines('met').length > 1);
});
