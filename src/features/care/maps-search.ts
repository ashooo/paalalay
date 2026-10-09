export type CareKind = 'hospitals' | 'clinics';

/** Google Maps categorical search: coordinates are transient and rounded to ~100 m. */
export function careSearchUrl(kind: CareKind, area: string | { latitude: number; longitude: number }): string {
  if (kind !== 'hospitals' && kind !== 'clinics') throw new Error('Choose hospitals or clinics.');
  let location: string;
  if (typeof area === 'string') {
    location = area.trim();
    if (!location || location.length > 160) throw new Error('Enter a city or area (up to 160 characters).');
  } else {
    const { latitude, longitude } = area;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new Error('Could not determine a valid location.');
    }
    location = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${kind} near ${location}`)}`;
}
