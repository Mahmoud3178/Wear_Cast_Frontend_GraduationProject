import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FactoryForAdminService {

  private api = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // GET PROFILE
  getFactoryProfile(id: number): Observable<any> {
    return this.http.get(`${this.api}/factories/profile?ProvidedFactoryId=${id}`);
  }

  // UPDATE PROFILE
  updateFactoryProfile(body: any): Observable<any> {
    return this.http.put(`${this.api}/factories/profile`, body);
  }

  // UPDATE IMAGE (logo)
  updateFactoryImage(factoryId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('NewLogo', file);
    formData.append('ProvidedFactoryId', factoryId.toString());

    return this.http.put(`${this.api}/factories/profile-image`, formData);
  }

createFactory(formData: FormData) {
  return this.http.post(
    `${this.api}/factories`,
    formData
  );
}
  // DELETE FACTORY
deleteFactory(id: number, reason: string) {
  const body = {
    reason: reason
  };

  return this.http.delete(`${this.api}/factories/${id}`, {
    body
  });
}
}
