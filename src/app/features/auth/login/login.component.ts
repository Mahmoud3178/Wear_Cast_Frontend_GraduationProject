import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {

  form = {
    email: '',
    password: ''
  };

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.auth.login(this.form).subscribe((res: any) => {

      if (!res) {
        alert('Invalid email or password');
        return;
      }

      this.auth.saveUser(res);

      if (res.role === 'ADMIN') {
        this.router.navigate(['/admin']);
      }
      else if (res.role === 'SELLER') {
        this.router.navigate(['/seller']);
      }
      else {
        this.router.navigate(['/customer']);
      }

    });
  }
}
