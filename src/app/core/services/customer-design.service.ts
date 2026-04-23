import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AddCustomerDesignRequest {
  viewDesignsJson: string;
  productId: number;
  productColorId: number;
  // Optional: 4 view images for the new draft API (front, back, left, right)
  frontImage?: Blob | File | string;
  backImage?: Blob | File | string;
  leftImage?: Blob | File | string;
  rightImage?: Blob | File | string;
}

export interface CustomerDesignImageRequest {
  side: 'front' | 'back' | 'left' | 'right';
  imageData: Blob | File | string; // Base64 string, Blob, or File
}

interface ApiEnvelope<T = unknown> {
  isSuccess: boolean;
  data?: T;
  error?: { code: string; description: string };
  validationErrors?: Record<string, string | string[]>;
}

@Injectable({ providedIn: 'root' })
export class CustomerDesignService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /** POST /api/customers/me/designs — creates a draft with customer artwork on a designed product color.
   *  Now accepts 4 view images (front, back, left, right) to attach to the draft.
   *  Returns created design id when the API sends one.
   */
  saveDesign(body: AddCustomerDesignRequest): Observable<number | null> {
    const url = `${this.base}/api/customers/me/designs`;
    const fd = new FormData();
    fd.append('ProductId', body.productId.toString());
    fd.append('ProductColorId', body.productColorId.toString());
    fd.append('ViewDesignsJson', body.viewDesignsJson);

    // Add 4 view images if provided (for the new draft API)
    if (body.frontImage) {
      this.appendImageToFormData(fd, 'FrontImage', body.frontImage);
    }
    if (body.backImage) {
      this.appendImageToFormData(fd, 'BackImage', body.backImage);
    }
    if (body.leftImage) {
      this.appendImageToFormData(fd, 'LeftImage', body.leftImage);
    }
    if (body.rightImage) {
      this.appendImageToFormData(fd, 'RightImage', body.rightImage);
    }

    return this.http.post<unknown>(url, fd).pipe(
      map(raw => {
        if (raw && typeof raw === 'object' && 'isSuccess' in raw) {
          const res = raw as ApiEnvelope;
          if (!res.isSuccess) {
            throw new Error(res.error?.description || 'Save design failed');
          }
          return this.extractDesignId(res.data);
        }
        return this.extractDesignId(raw);
      }),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          const b = err.error as ApiEnvelope | Record<string, unknown> | null;
          if (b && typeof b === 'object' && 'isSuccess' in b && !(b as ApiEnvelope).isSuccess) {
            const e = (b as ApiEnvelope).error?.description;
            return throwError(() => new Error(e || err.message || `HTTP ${err.status}`));
          }
          if (b && typeof b === 'object' && 'detail' in b && typeof (b as any).detail === 'string') {
            return throwError(() => new Error((b as any).detail));
          }
          return throwError(() => new Error(err.message || `HTTP ${err.status}`));
        }
        return throwError(() =>
          err instanceof Error ? err : new Error(String(err))
        );
      })
    );
  }

  private appendImageToFormData(fd: FormData, fieldName: string, imageData: Blob | File | string): void {
    if (typeof imageData === 'string') {
      // If it's a base64 data URL, convert to blob
      if (imageData.startsWith('data:')) {
        const blob = this.dataURLToBlob(imageData);
        fd.append(fieldName, blob, `${fieldName.toLowerCase()}.png`);
      } else {
        // Plain string (unlikely for images, but handle it)
        fd.append(fieldName, imageData);
      }
    } else {
      // Blob or File
      fd.append(fieldName, imageData);
    }
  }

  private dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /** Generate view images from canvas elements or data URLs for the 4 product views.
   *  Returns an object with front, back, left, right image data that can be passed to saveDesign.
   */
  generateViewImagesFromCanvases(
    frontCanvas?: HTMLCanvasElement | null,
    backCanvas?: HTMLCanvasElement | null,
    leftCanvas?: HTMLCanvasElement | null,
    rightCanvas?: HTMLCanvasElement | null
  ): { front?: string; back?: string; left?: string; right?: string } {
    const result: { front?: string; back?: string; left?: string; right?: string } = {};

    if (frontCanvas) {
      result.front = frontCanvas.toDataURL('image/png');
    }
    if (backCanvas) {
      result.back = backCanvas.toDataURL('image/png');
    }
    if (leftCanvas) {
      result.left = leftCanvas.toDataURL('image/png');
    }
    if (rightCanvas) {
      result.right = rightCanvas.toDataURL('image/png');
    }

    return result;
  }

  private extractDesignId(data: unknown): number | null {
    if (typeof data === 'number' && Number.isFinite(data)) {
      return data;
    }
    if (typeof data === 'string' && /^\d+$/.test(data)) {
      return parseInt(data, 10);
    }
    if (!data || typeof data !== 'object') {
      return null;
    }
    const o = data as Record<string, unknown>;
    const v =
      o['id'] ??
      o['Id'] ??
      o['designId'] ??
      o['DesignId'] ??
      o['customerDesignId'] ??
      o['CustomerDesignId'];
    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      return parseInt(v, 10);
    }
    return null;
  }
}
