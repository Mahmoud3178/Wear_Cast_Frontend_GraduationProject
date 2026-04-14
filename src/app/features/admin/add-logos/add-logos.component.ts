import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-logos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-logos.component.html',
  styleUrl: './add-logos.component.css'
})
export class AddLogosComponent {

  logoName = '';
  category = '';
  altText = '';
  file: File | null = null;

  onFileSelect(event: any) {
    this.file = event.target.files[0];
  }

  upload() {
    if (!this.file || !this.logoName) {
      alert('Fill all required fields ❌');
      return;
    }

    alert('Logo Uploaded ✅');
  }

}
