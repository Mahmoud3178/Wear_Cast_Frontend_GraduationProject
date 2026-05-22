import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeWearCastApiDateToIso } from '../utils/api-date';

export interface DesignReview {
  reviewId: number;
  reviewerName: string;
  rating: number;               // 1-5
  comment: string;
  createdAt: string;
  isOwn?: boolean;
  customerImageUrl?: string | null;
}

export interface CreateReviewRequest {
  rating: number;
  comment: string;
}

@Injectable({ providedIn: 'root' })
export class DesignReviewService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getReviews(productId: number, pageIndex = 1, pageSize = 20): Observable<DesignReview[]> {
    return this.http.get<any>(
      `${this.base}/api/designed-products/${productId}/reviews`,
      { params: { pageIndex, pageSize } }
    ).pipe(
      map(res => {
        let rows: any = res?.data ?? res?.items ?? res?.results ?? res;
        if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
          rows = rows.items ?? rows.data ?? rows.results ?? rows.reviews ?? rows.list ?? [];
        }
        if (!Array.isArray(rows)) return [];
        return rows.map((r: any) => {
          const rawDate =
            r.createdAt ?? r.CreatedAt ?? r.created ?? r.date ?? r.Date;
          const createdAt =
            normalizeWearCastApiDateToIso(rawDate) ||
            (typeof rawDate === 'string' ? rawDate : '') ||
            '';
          return {
            reviewId: r.reviewId || r.id || r.reviewID || r.Id || r.ID,
            reviewerName:
              r.reviewerName || r.reviewer || r.customerName || r.userName || r.user || 'Customer',
            rating: r.rating || r.Rate || r.rate || r.Rating || 0,
            comment: r.comment || r.Comment || r.body || r.Body || r.text || r.Text || '',
            createdAt,
            isOwn: false,
            customerImageUrl: r.customerImageUrl || r.CustomerImageUrl || r.reviewerImageUrl || r.ReviewerImageUrl || null
          } as DesignReview;
        });
      }),
      catchError(() => of([]))
    );
  }

  getMyReview(productId: number): Observable<DesignReview | null> {
    return this.http.get<any>(
      `${this.base}/api/designed-products/${productId}/my-review`
    ).pipe(
      map(res => {
        const r = res?.data ?? res;
        // Must be a valid object with actual review data (rating > 0 or has comment)
        if (!r || typeof r !== 'object') return null;
        const hasContent = (r.rating && r.rating > 0) || (r.comment && String(r.comment).trim());
        if (!hasContent) return null;
        const rawMy =
          r.createdAt ?? r.CreatedAt ?? r.date ?? r.Date;
        const createdAtMy =
          normalizeWearCastApiDateToIso(rawMy) ||
          (typeof rawMy === 'string' ? rawMy : '') ||
          '';
        return {
          reviewId: r.reviewId || r.id || r.reviewID || r.ID,
          reviewerName: r.reviewerName || r.reviewer || r.customerName || r.userName || 'Me',
          rating: r.rating || r.Rate || r.rate || 0,
          comment: r.comment || r.Comment || r.body || r.Body || '',
          createdAt: createdAtMy,
          isOwn: true,
          customerImageUrl: r.customerImageUrl || r.CustomerImageUrl || r.reviewerImageUrl || r.ReviewerImageUrl || null
        } as DesignReview;
      }),
      catchError(() => of(null))
    );
  }

  submitReview(productId: number, body: CreateReviewRequest): Observable<any> {
    return this.http.post(
      `${this.base}/api/designed-products/${productId}/reviews`,
      body
    );
  }

  deleteReview(reviewId: number): Observable<any> {
    return this.http.delete(
      `${this.base}/api/designed-product-reviews/${reviewId}`
    );
  }
}
