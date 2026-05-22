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
  customerImageUrl?: string | null;
}

export interface ReviewsPage {
  reviews: FixedProductReview[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  averageRating: number;
}

export interface CreateFixedProductReviewRequest {
  rating: number;
  comment: string;
}

@Injectable({ providedIn: 'root' })
export class FixedProductReviewService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getReviews(productId: number, pageIndex = 1, pageSize = 5): Observable<ReviewsPage> {
    return this.http.get<any>(
      `${this.base}/api/fixed-products/${productId}/reviews`,
      { params: { pageIndex, pageSize } }
    ).pipe(
      map(res => this.mapPage(res, pageIndex, pageSize)),
      catchError(() => of({ reviews: [], totalCount: 0, pageIndex: 1, pageSize, totalPages: 0, averageRating: 0 }))
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

  private mapPage(res: any, pageIndex: number, pageSize: number): ReviewsPage {
    // Unwrap common envelopes
    let payload = res?.data ?? res?.result ?? res ?? {};
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const inner = payload?.data ?? payload?.result;
      if (inner != null) payload = inner;
    }

    // Extract list
    let rows: any = payload?.items ?? payload?.reviews ?? payload?.data ?? payload?.results ?? payload;
    if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
      rows = rows.items ?? rows.data ?? rows.results ?? rows.reviews ?? [];
    }
    if (!Array.isArray(rows)) rows = [];

    const reviews = rows.map((r: any) => this.mapOne(r, false));
    const totalCount = payload?.totalCount ?? payload?.total ?? payload?.count ?? reviews.length;
    const pageCount = payload?.totalPages ?? payload?.pages ?? (totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0);

    // Compute average rating from reviews if API doesn't provide it
    const apiAvg = payload?.averageRating ?? payload?.average ?? payload?.avgRating;
    const averageRating = (typeof apiAvg === 'number' && apiAvg > 0)
      ? apiAvg
      : (reviews.length > 0 ? reviews.reduce((s: number, r: FixedProductReview) => s + r.rating, 0) / reviews.length : 0);

    return {
      reviews,
      totalCount,
      pageIndex: payload?.pageIndex ?? pageIndex,
      pageSize: payload?.pageSize ?? pageSize,
      totalPages: pageCount,
      averageRating
    };
  }

  private mapOne(r: any, isOwn: boolean): FixedProductReview {
    return {
      reviewId: r.reviewId ?? r.id ?? r.reviewID ?? r.Id ?? 0,
      reviewerName: r.reviewerName ?? r.reviewer ?? r.customerName ?? r.userName ?? 'Customer',
      rating: r.rating ?? r.Rate ?? r.rate ?? 0,
      comment: r.comment ?? r.Comment ?? r.body ?? r.text ?? '',
      createdAt: r.createdAt ?? r.CreatedAt ?? r.created ?? r.date ?? '',
      isOwn,
      customerImageUrl: r.customerImageUrl ?? r.CustomerImageUrl ?? r.reviewerImageUrl ?? r.ReviewerImageUrl ?? null
    };
  }
}
