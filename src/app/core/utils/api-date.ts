/**
 * Normalize WearCast / ASP.NET style date payloads for Angular DatePipe and JS Date.
 * Handles ISO strings, Unix ms/s, and Microsoft JSON `/Date(ms)/`.
 */
export function parseWearCastApiDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = value;
    const ms = n > 1e12 ? n : n > 1e9 ? n * 1000 : n;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  const m = /^\/Date\((-?\d+)\)\/$/.exec(s);
  if (m) {
    const d = new Date(parseInt(m[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Stable ISO string for templates / pipes, or null if unparseable. */
export function normalizeWearCastApiDateToIso(value: unknown): string | null {
  const d = parseWearCastApiDate(value);
  return d ? d.toISOString() : null;
}
