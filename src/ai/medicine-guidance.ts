import { toolError, type ToolHandlers } from '../contracts/tools';
import { normalizeMedicine, suggestMedicines } from '../features/medicines/reference/catalog';

const origin = 'https://www.nhs.uk';
function text(html: string) {
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
export function guidanceExcerpt(html: string, topic: string): string | undefined {
  if (topic === 'general_safety') return undefined;
  const pattern = topic === 'missed_dose' ? /forget|miss(?:ed)? (?:a |your )?dose/i : /food|eat|empty stomach/i;
  for (const section of html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b|<\/main>|$)/gi)) {
    if (!pattern.test(text(section[1]))) continue;
    const excerpt = text(section[1] + ' ' + section[2]);
    // Never truncate clinical caveats; return only source links if a whole section cannot fit.
    if (excerpt.length > 30 && excerpt.length <= 1800 && !/\b(?:mg|micrograms|milligrams|millilitres)\b/i.test(excerpt)) return excerpt;
  }
  return undefined;
}
export function medicineLinks(html: string) {
  return [...html.matchAll(/<a\b[^>]*href=["'](\/medicines\/[a-z0-9-]+\/)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => ({ title: text(match[2]), url: `${origin}${match[1]}` }));
}

/** Network is injected for tests. Invoked only by the confirmation dispatcher. */
export function createMedicineReferenceHandlers(request: typeof fetch = fetch): ToolHandlers {
  return {
    lookup_medicine_reference: async ({ medicine }) => ({ status: 'success', data: {
      matches: suggestMedicines(medicine).map(({ name, page }) => ({ name, page })),
      guidance_available: false, source: 'User-supplied PNF EML 2022 medicine-name reference; no dosing or safety guidance.',
    } }),
    search_medicine_guidance: async ({ medicine, topic }) => {
      // Restrict the lookup to a name, not arbitrary patient notes or a free-text query.
      if (!/^[\p{L} ()+’'\-]+$/u.test(medicine) || medicine.length > 100) return toolError('VALIDATION_ERROR', 'Use only a medicine name, without personal details or doses.');
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 15000);
      const get = async (url: string) => {
        const response = await request(url, { signal: abort.signal, credentials: 'omit', redirect: 'error', headers: { Accept: 'text/html' } });
        if (!response.ok) throw new Error('Unavailable');
        const html = await response.text();
        if (html.length > 1000000) throw new Error('Too large');
        return html;
      };
      try {
        const index = await get(`${origin}/medicines/`);
        const key = normalizeMedicine(medicine);
        const exact = medicineLinks(index).filter(link => normalizeMedicine(link.title) === key || normalizeMedicine(link.title.split(' (')[0]) === key);
        const unique = [...new Map(exact.map(link => [link.url, link])).values()];
        // Never choose a formulation/age group, similar drug, or fuzzy match automatically.
        if (unique.length !== 1) return toolError('NOT_FOUND', 'No unambiguous NHS medicine page was found. Check the exact product leaflet or ask a pharmacist. No dosing advice was retrieved.');
        const source = unique[0];
        const page = await get(source.url);
        const slug = new URL(source.url).pathname.split('/')[2];
        const topicPath = `/medicines/${slug}/how-and-when-to-take-${slug}/`;
        const hasTopic = [topicPath, `${origin}${topicPath}`].some(path => page.includes(`"${path}"`) || page.includes(`'${path}'`));
        const url = topic === 'general_safety' || !hasTopic ? source.url : `${origin}${topicPath}`;
        const guidance = url === source.url ? page : await get(url);
        const excerpt = guidanceExcerpt(guidance, topic);
        return { status: 'success', data: {
          sources: [{ title: topic === 'general_safety' || !hasTopic ? source.title : `${source.title}: how and when to take`, url, ...(excerpt ? { excerpt } : {}) }],
          provider: 'NHS', checked_at: new Date().toISOString(),
          note: excerpt ? 'This is general NHS reference text, not a prescription or personalized instruction. Cite this source and preserve its caveats. Check your exact product leaflet or pharmacist before acting; formulations and local instructions may differ. Never calculate doses or change reminders. The conversation and records were not sent.' : 'No relevant complete safety section was retrieved. These are verified source links only: do not invent instructions from their titles. Open the source and check your exact product leaflet or pharmacist. NHS guidance may differ from your local product. The conversation and records were not sent.',
        } };
      } catch {
        return toolError('INTERNAL_ERROR', 'Online lookup is unavailable (offline, timeout, browser access restriction, or provider error). Check your product leaflet or pharmacist. No automatic retry was made.');
      } finally { clearTimeout(timer); }
    },
  };
}
