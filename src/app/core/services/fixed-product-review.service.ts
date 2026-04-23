import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface FixedProductReview {
  reviewId: number;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  isOwn?: boolean;
}

export interface CreateFixedProductReviewRequest {
  rating: number;
  comment: string;
}

@Injectable({ providedIn: 'root' })
export class FixedProductReviewService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getReviews(productId: number, pageIndex = 1, pageSize = 20): Observable<FixedProductReview[]> {
    return this.http.get<any>(
      `${this.base}/api/fixed-products/${productId}/reviews`,
      { params: { pageIndex, pageSize } }
    ).pipe(
      map(res => this.mapList(res)),
      catchError(() => of([]))
    );
  }

  getMyReview(productId: number): Observable<FixedProductReview | null> {
    return this.http.get<any>(
      `${this.base}/api/fixed-products/${productId}/my-review`
    ).pipe(
      map(res => {
        const r = res?.data ?? res;
        if (!r || typeof r !== 'object') return null;
        const hasContent = (r.rating && r.rating > 0) || (r.comment && String(r.comment).trim());
        if (!hasContent) return null;
        return this.mapOne(r, true);
      }),
      catchError(() => of(null))
    );
  }

  submitReview(productId: number, body: CreateFixedProductReviewRequest): Observable<any> {
    return this.http.post(
      `${this.base}/api/fixed-products/${productId}/reviews`,
      body
    );
  }

  deleteReview(reviewId: number): Observable<any> {
    return this.http.delete(
      `${this.base}/api/fixed-product-reviews/${reviewId}`
    );
  }

  private mapList(res: any): FixedProductReview[] {
    let rows: any = res?.data ?? res?.items ?? res?.results ?? res;
    if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
      rows = rows.items ?? rows.data ?? rows.results ?? rows.reviews ?? [];
    }
    if (!Array.isArray(rows)) return [];
    return rows.map((r: any) => this.mapOne(r, false));
  }

  private mapOne(r: any, isOwn: boolean): FixedProductReview {
    return {
      reviewId: r.reviewId ?? r.id ?? r.reviewID ?? r.Id ?? 0,
      reviewerName: r.reviewerName ?? r.reviewer ?? r.customerName ?? r.userName ?? 'Customer',
      rating: r.rating ?? r.Rate ?? r.rate ?? 0,
      comment: r.comment ?? r.Comment ?? r.body ?? r.text ?? '',
      createdAt: r.createdAt ?? r.CreatedAt ?? r.created ?? r.date ?? '',
      isOwn
    };
  }
}
