import { environment } from '../../../environments/environment';

/**
 * Same-origin URL for fetching garment bytes (try-on). Strips wear-cast host so
 * `/uploads/...` is proxied in dev (proxy.conf.json) and on Vercel (vercel.json).
 */
export function resolveGarmentFetchUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return '';
  if (u.startsWith('data:')) return u;

  try {
    const abs = u.startsWith('//')
      ? `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${u}`
      : u;
    if (/^https?:\/\//i.test(abs)) {
      const parsed = new URL(abs);
      const host = parsed.hostname.toLowerCase();
      if (host === 'wear-cast.runasp.net' || host.endsWith('.runasp.net')) {
        return parsed.pathname + parsed.search;
      }
      if (typeof window !== 'undefined') {
        const pageOrigin = window.location.origin.toLowerCase();
        if (parsed.origin.toLowerCase() === pageOrigin) {
          return parsed.pathname + parsed.search;
        }
      }
    }
  } catch {
    /* fall through */
  }

  if (u.startsWith('/uploads') || (u.startsWith('/') && !u.startsWith('//'))) {
    return u;
  }

  const base = environment.apiUrl.replace(/\/$/, '');
  const path = u.startsWith('/') ? u : `/${u}`;
  return base ? `${base}${path}` : path;
}

export async function fetchGarmentBlob(imageUrl: string): Promise<Blob> {
  const url = resolveGarmentFetchUrl(imageUrl);
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) {
    throw new Error(`Garment image HTTP ${res.status}`);
  }
  return res.blob();
}

export function guessExtFromUrl(url: string): string {
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.webp')) return 'webp';
  if (lower.endsWith('.gif')) return 'gif';
  return 'jpg';
}
