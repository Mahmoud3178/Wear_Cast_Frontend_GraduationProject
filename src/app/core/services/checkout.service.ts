import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ShippingInfoDto {
  recipientName: string;
  phoneNumber: string;
  additionalPhoneNumber?: string | null;
  state: string;
  city: string;
  street: string;
  buildingNumber: string;
}

export interface CreateCheckoutSessionRequestDto {
  shippingInfo: ShippingInfoDto;
}

export interface CheckoutResponse {
  clientSecret?: string;
  paymentIntentId?: string;
  sessionId?: string;
  sessionUrl?: string;
  url?: string;
  orderId?: number;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly base = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getShippingInfo(): Observable<ShippingInfoDto | null> {
    return this.http.get<any>(`${this.base}/api/Checkout/ShippingInfo`).pipe(
      map(res => {
        const d = res?.data ?? res;
        if (!d || typeof d !== 'object') return null;
        return d as ShippingInfoDto;
      }),
      catchError(() => [null])
    );
  }

  createCheckoutSession(body: CreateCheckoutSessionRequestDto): Observable<CheckoutResponse> {
    return this.http.post<any>(`${this.base}/api/Checkout`, body).pipe(
      map(res => (res?.data ?? res) as CheckoutResponse)
    );
  }
}
