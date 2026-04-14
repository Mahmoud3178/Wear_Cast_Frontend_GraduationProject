import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-admin.component.html',
  styleUrl: './add-admin.component.css'
})
export class AddAdminComponent {

  admin = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Editor',
    password: '',
    confirmPassword: ''
  };

}
