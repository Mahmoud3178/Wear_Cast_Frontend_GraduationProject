import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** Normalized stream snapshot for UI progress. */
export interface TryOnStreamSnapshot {
  raw: unknown;
  progress: number | null;
  message: string | null;
  isComplete: boolean;
  isFailed: boolean;
}

/** Normalized result for displaying the output image. */
export interface TryOnResult {
  raw: unknown;
  imageUrl: string | null;
}

/** POST /tryon immediate response. */
export interface TryOnStartResponse {
  taskId: string;
  estimatedSeconds: number | null;
}

@Injectable({ providedIn: 'root' })
export class TryOnService {
  private readonly base = environment.tryOnApiBase.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  /** Ngrok free tier may show an interstitial; this header reduces HTML warning pages on API calls. */
  private ngrokHeaders(): HttpHeaders {
    return new HttpHeaders({
      'ngrok-skip-browser-warning': '1'
    });
  }

  /**
   * POST /tryon — multipart person + garment.
   * Returns task id and optional ETA; prefer root `task_id` over nested `data.id` so we never poll the wrong id.
   */
  startTryOn(
    person: File,
    garment: Blob,
    garmentFileName = 'garment.jpg'
  ): Observable<TryOnStartResponse> {
    const fd = new FormData();
    fd.append('person', person, person.name || 'person.jpg');
    fd.append('garment', garment, garmentFileName);
    const url = `${this.base}/tryon`;
    return this.http.post<unknown>(url, fd, { headers: this.ngrokHeaders() }).pipe(
      map(body => {
        const taskId = this.extractTaskId(body);
        if (!taskId) {
          throw new Error('Try-on service did not return a task id.');
        }
        return {
          taskId,
          estimatedSeconds: this.extractEstimatedSeconds(body)
        };
      }),
      catchError(err => {
        const msg =
          err?.error?.message ||
          err?.error?.detail ||
          err?.message ||
          'Try-on could not be started.';
        return throwError(() => new Error(typeof msg === 'string' ? msg : 'Try-on could not be started.'));
      })
    );
  }

  /** GET /stream/{task_id} — poll for progress (JSON). */
  getStream(taskId: string): Observable<unknown> {
    const url = `${this.base}/stream/${encodeURIComponent(taskId)}`;
    return this.http.get<unknown>(url, { headers: this.ngrokHeaders() });
  }

  /**
   * GET /result/{task_id} exactly once semantics (caller owns polling).
   * Handles JSON bodies and raw `image/png` / `image/jpeg` bytes — HttpClient JSON parse fails on binaries.
   */
  getResultOnce(taskId: string): Observable<TryOnResult> {
    const url = `${this.base}/result/${encodeURIComponent(taskId)}`;
    return this.http
      .get(url, {
        headers: this.ngrokHeaders(),
        observe: 'response',
        responseType: 'blob'
      })
      .pipe(
        switchMap(resp => {
          if (!resp.ok) {
            return from(this.describeFailedTryOnResult(resp.status, resp.body));
          }
          if (!resp.body) {
            return from(Promise.reject(new Error(`HTTP ${resp.status}`)));
          }
          return from(this.interpretResultBlobResponse(resp));
        }),
        catchError(err => {
          const msg =
            err?.error?.message ??
            err?.message ??
            err?.detail ??
            'Could not load try-on result.';
          return throwError(() =>
            new Error(typeof msg === 'string' ? msg : 'Could not load try-on result.')
          );
        })
      );
  }

  /** @deprecated Prefer `getResultOnce` — same implementation. */
  getResult(taskId: string): Observable<TryOnResult> {
    return this.getResultOnce(taskId);
  }

  private async describeFailedTryOnResult(status: number, body: Blob | null): Promise<never> {
    let hint = Number.isFinite(status) && status >= 400 ? `HTTP ${status}` : 'Request failed';
    if (body && body.size > 0 && body.size < 16_384) {
      try {
        const t = await body.text();
        try {
          const j = JSON.parse(t) as Record<string, unknown>;
          hint =
            (typeof j['detail'] === 'string' && j['detail'].trim()) ||
            (typeof j['message'] === 'string' && j['message'].trim()) ||
            t.slice(0, 600);
        } catch {
          hint = t.slice(0, 600).trim() || hint;
        }
      } catch {
        /* ignore */
      }
    }
    throw new Error(hint);
  }

  private async interpretResultBlobResponse(resp: HttpResponse<Blob>): Promise<TryOnResult> {
    const blob = resp.body as Blob;
    const ct = (resp.headers.get('content-type') || '').toLowerCase();

    if (ct.includes('application/json') || ct.includes('text/json')) {
      const text = await blob.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        /* keep string */
      }
      return { raw: parsed, imageUrl: this.extractResultImageUrl(parsed) };
    }

    if (ct.startsWith('image/')) {
      const url = URL.createObjectURL(blob);
      return { raw: null, imageUrl: url };
    }

    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const isPng =
      head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
    const isJpeg = head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;

    if (isPng || isJpeg) {
      const url = URL.createObjectURL(blob);
      return { raw: null, imageUrl: url };
    }

    /* Unknown bytes — attempt JSON/text interpretation */
    const text = await blob.text();
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const j = JSON.parse(text) as unknown;
        return { raw: j, imageUrl: this.extractResultImageUrl(j) };
      } catch {
        /* fallthrough */
      }
    }
    const fromStr = pickRenderableImageFromString(text);
    if (fromStr) return { raw: text, imageUrl: fromStr };
    return { raw: text, imageUrl: null };
  }

  /** Map a stream JSON body to a normalized snapshot (best-effort for unknown API shapes). */
  parseStreamPayload(body: unknown): TryOnStreamSnapshot {
    if (body == null) {
      return { raw: body, progress: null, message: null, isComplete: false, isFailed: false };
    }
    const o = body as Record<string, unknown>;
    const progressRaw =
      o['progress'] ??
      o['Progress'] ??
      o['percent'] ??
      o['Percent'] ??
      o['percentage'] ??
      o['Percentage'];
    let progress: number | null = null;
    if (typeof progressRaw === 'number' && Number.isFinite(progressRaw)) {
      progress = progressRaw <= 1 && progressRaw > 0 ? Math.round(progressRaw * 100) : Math.round(progressRaw);
    } else if (typeof progressRaw === 'string' && /^\d+(\.\d+)?$/.test(progressRaw)) {
      const n = parseFloat(progressRaw);
      progress = n <= 1 && n > 0 ? Math.round(n * 100) : Math.round(n);
    }

    const statusRaw = String(
      o['status'] ?? o['Status'] ?? o['state'] ?? o['State'] ?? ''
    ).toLowerCase();
    const message =
      pickStr(o, ['message', 'Message', 'detail', 'Detail', 'statusMessage', 'StatusMessage']) || null;

    const isFailed =
      statusRaw.includes('fail') ||
      statusRaw.includes('error') ||
      statusRaw === 'failed' ||
      Boolean(o['error'] ?? o['Error']);

    /* Do not treat `progress >= 100` as terminal: APIs often sit at 100% while copying output,
       which would repeatedly mark “complete” every poll cycle. Terminal only on explicit signals. */
    const isComplete =
      isFailed ||
      statusRaw.includes('complete') ||
      statusRaw.includes('done') ||
      statusRaw === 'success' ||
      statusRaw === 'finished' ||
      Boolean(o['done'] ?? o['Done'] ?? o['completed'] ?? o['Completed']);

    return { raw: body, progress, message, isComplete, isFailed };
  }

  private extractTaskId(body: unknown): string | null {
    if (body == null) return null;
    if (typeof body === 'string' && body.trim()) return body.trim();
    if (typeof body === 'number' && Number.isFinite(body)) return String(body);
    if (typeof body !== 'object') return null;
    const o = body as Record<string, unknown>;
    const fromRoot = this.pickTaskIdFromObject(o);
    if (fromRoot) return fromRoot;
    const inner = o['data'] ?? o['Data'];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      return this.pickTaskIdFromObject(inner as Record<string, unknown>);
    }
    return null;
  }

  /** Prefer explicit task id fields before generic `id` (nested envelopes often use `id` for something else). */
  private pickTaskIdFromObject(box: Record<string, unknown>): string | null {
    const preferKeys = ['task_id', 'taskId', 'TaskId'];
    for (const k of preferKeys) {
      const s = this.coerceIdString(box[k]);
      if (s) return s;
    }
    for (const k of ['id', 'Id']) {
      const s = this.coerceIdString(box[k]);
      if (s) return s;
    }
    return null;
  }

  private coerceIdString(v: unknown): string | null {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    return null;
  }

  private extractEstimatedSeconds(body: unknown): number | null {
    if (body == null || typeof body !== 'object') return null;
    const o = body as Record<string, unknown>;
    const v =
      o['estimated_time_seconds'] ??
      o['estimatedTimeSeconds'] ??
      o['EstimatedTimeSeconds'] ??
      o['eta_seconds'] ??
      o['etaSeconds'];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      return Math.min(Math.round(v), 3600);
    }
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      return Math.min(parseInt(v, 10), 3600);
    }
    return null;
  }

  private extractResultImageUrl(body: unknown): string | null {
    if (body == null) return null;
    const flat = coerceJsonString(body);
    if (flat !== body) return this.extractResultImageUrl(flat);

    if (typeof body === 'string') {
      return pickRenderableImageFromString(body);
    }
    if (typeof body !== 'object') return null;
    const o = body as Record<string, unknown>;
    const inner = (o['data'] ?? o['Data']) as Record<string, unknown> | undefined;
    const resultBox = (o['result'] ?? o['Result'] ?? o['output'] ?? o['Output']) as
      | Record<string, unknown>
      | undefined;
    const nested =
      resultBox && typeof resultBox === 'object' && !Array.isArray(resultBox)
        ? resultBox
        : null;
    const box = inner && typeof inner === 'object' && !Array.isArray(inner) ? inner : o;

    const direct = pickStr(box, RESULT_URL_KEYS);
    const fromNested = nested ? pickStr(nested, RESULT_URL_KEYS) : null;
    if (direct) return normalizePossibleRelativeImageUrl(direct);
    if (fromNested) return normalizePossibleRelativeImageUrl(fromNested);

    const mergeBox = nested ? { ...box, ...nested } : box;

    const b64 = pickStr(mergeBox, [
      'imageBase64',
      'ImageBase64',
      'base64',
      'Base64',
      'output_base64',
      'outputBase64'
    ]);
    if (b64 && b64.length > 40) {
      if (b64.startsWith('data:')) return b64;
      return `data:image/jpeg;base64,${b64}`;
    }

    /* Deep fallback: APIs sometimes nest URLs under unexpected keys */
    const deep = deepFindRenderableImage(body, 0);
    return deep ? normalizePossibleRelativeImageUrl(deep) : null;
  }
}

/** Common try-on FastAPI / proxy response keys (snake + camel). */
const RESULT_URL_KEYS = [
  'imageUrl',
  'ImageUrl',
  'resultUrl',
  'ResultUrl',
  'generatedUrl',
  'GeneratedUrl',
  'output_image_url',
  'outputImageUrl',
  'result_image_url',
  'image_path',
  'ImagePath',
  'output_path',
  'OutputPath',
  'url',
  'Url',
  'outputUrl',
  'OutputUrl',
  'output_url',
  'Output_URL',
  'href',
  'Href',
  'image',
  'Image',
  'fileUrl',
  'FileUrl',
  'downloadUrl',
  'DownloadUrl',
  'path',
  'Path'
];

/** If the server responds with JSON as a string body, parse once. */
function coerceJsonString(body: unknown): unknown {
  if (typeof body !== 'string') return body;
  const s = body.trim();
  if (!s.startsWith('{') && !s.startsWith('[')) return body;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return body;
  }
}

function pickRenderableImageFromString(sRaw: string): string | null {
  const s = sRaw.trim();
  if (!s || /^(pending|processing|null|undefined)$/i.test(s)) return null;
  if (s.startsWith('data:image') || /^https?:\/\//i.test(s) || (s.startsWith('/') && s.length > 5)) {
    return s;
  }
  if (s.length > 180 && /^[A-Za-z0-9+/=\s]+$/.test(s)) {
    return `data:image/jpeg;base64,${s.replace(/\s/g, '')}`;
  }
  return null;
}

function normalizePossibleRelativeImageUrl(url: string): string {
  const u = url.trim();
  if (!u.startsWith('/') || /^\/\//.test(u)) return u;
  return u;
}

function deepFindRenderableImage(val: unknown, depth: number): string | null {
  if (depth > 14 || val == null) return null;

  const fromStr = typeof val === 'string' ? pickRenderableImageFromString(val) : null;
  if (fromStr) return fromStr;

  if (typeof val !== 'object') return null;

  if (Array.isArray(val)) {
    for (const el of val) {
      const f = deepFindRenderableImage(el, depth + 1);
      if (f) return f;
    }
    return null;
  }

  const o = val as Record<string, unknown>;
  for (const k of RESULT_URL_KEYS) {
    const v = o[k];
    if (typeof v === 'string') {
      const picked = pickRenderableImageFromString(v);
      if (picked) return picked;
    }
  }

  for (const sub of Object.values(o)) {
    const f = deepFindRenderableImage(sub, depth + 1);
    if (f) return f;
  }
  return null;
}

function pickStr(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}
