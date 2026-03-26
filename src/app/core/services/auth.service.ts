import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private router: Router) {}

  // 🔥 USERS FAKE DATABASE
  private users = [
    { email: 'admin@test.com', password: '123', role: 'ADMIN' },
    { email: 'seller@test.com', password: '123', role: 'SELLER' },
    { email: 'user@test.com', password: '123', role: 'CUSTOMER' }
  ];

  // ✅ LOGIN (Fake)
  login(data: any): Observable<{ token: string; role: string } | null> {
  const user = this.users.find(u =>
    u.email === data.email && u.password === data.password
  );

  if (user) {
    return of({
      token: 'fake-token',
      role: user.role
    });
  } else {
    return of(null);
  }
}

  // ✅ REGISTER CUSTOMER
  registerCustomer(data: any) {
    this.users.push({
      email: data.email,
      password: data.password,
      role: 'CUSTOMER'
    });

    return of({ message: 'Customer Registered' });
  }

  // ✅ REGISTER SELLER
  registerSeller(data: any) {
    this.users.push({
      email: data.email,
      password: data.password,
      role: 'SELLER'
    });

    return of({ message: 'Seller Registered' });
  }

  // ✅ SAVE USER
  saveUser(res: any) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('role', res.role);
  }

  getRole() {
    return localStorage.getItem('role');
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
