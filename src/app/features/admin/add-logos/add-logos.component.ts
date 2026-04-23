import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminLogosService } from '../../../core/services/admin-logos.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-logos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-logos.component.html',
  styleUrl: './add-logos.component.css'
})
export class AddLogosComponent implements OnInit {

  logoName = '';
  categoryId: number | null = null;
  file: File | null = null;

  categories: any[] = [];

  constructor(private service: AdminLogosService, private router: Router) {}

  ngOnInit() {
    this.loadCategories();
  }

  // 🔹 Get categories from API
loadCategories() {
  this.service.getCategories().subscribe({
    next: (res: any) => {
      this.categories = res?.data || [];  // ✅ المهم هنا

      console.log('categories:', this.categories);
    },
    error: (err) => console.error(err)
  });
}

  // 🔹 File select
  onFileSelect(event: any) {
    this.file = event.target.files[0];
  }

  // 🔹 Upload logo
  upload() {

    if (!this.file || !this.logoName || !this.categoryId) {
      alert('❌ Please fill all fields');
      return;
    }

    const formData = new FormData();
    formData.append('Name', this.logoName);
    formData.append('Image', this.file);
    formData.append('CategoryId', this.categoryId.toString());

    // optional sizes (لو مش عندك سيبهم)
    formData.append('WidthPx', '300');
    formData.append('HeightPx', '300');

this.service.createLogo(formData).subscribe({
  next: () => {
    alert('✅ Logo uploaded successfully');

    // reset form
    this.logoName = '';
    this.categoryId = null;
    this.file = null;

    // 🔥 هنا التحويل
    this.router.navigate(['/admin/logos']);
  },
  error: (err) => {
    console.error(err);
    alert('❌ Upload failed');
  }
});
  }

  cancel() {
    this.logoName = '';
    this.categoryId = null;
    this.file = null;
  }
}
