import rows from './medicine-names.json';

export const normalizeMedicine = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9+]+/g, ' ').trim();
// Remove only the reference's footnote flags, never salt/form or combination names.
export const referenceName = (value: string) => value.replace(/\s*\((?:[AB]\d*|\d+(?:\s*,\s*\d+)*)\)/g, '').trim();
export const medicineCatalog = rows.map(row => ({ ...row, name: referenceName(row.name), listedName: row.name }));

function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
    previous = next;
  }
  return previous[b.length];
}

export function suggestMedicines(query: string, limit = 5) {
  const key = normalizeMedicine(query);
  if (key.length < 2 || key.length > 100) return [];
  const unique = new Map<string, typeof medicineCatalog[number]>();
  for (const row of medicineCatalog) if (!unique.has(row.name)) unique.set(row.name, row);
  return [...unique.values()].map(row => {
    const names = [normalizeMedicine(row.name), normalizeMedicine(row.name.split(' (')[0])];
    const score = Math.min(...names.map(name => name === key ? 0 : name.startsWith(key) ? 1 : key.length >= 5 && distance(key, name) <= 2 ? 2 + distance(key, name) : 100));
    return { ...row, score };
  }).filter(row => row.score < 100).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name)).slice(0, Math.min(10, Math.max(0, limit)));
}
