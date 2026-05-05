import { ToastService } from '../../../core/services/toast.service';
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

  widthPx: number = 100;   // 🔥 NEW
  heightPx: number = 100;  // 🔥 NEW

  file: File | null = null;

  categories: any[] = [];

constructor(
    private service: AdminLogosService,
    private router: Router,
    private toast: ToastService  // ← أضف السطر ده
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.service.getCategories().subscribe({
      next: (res: any) => {
        this.categories = res?.data || [];
      },
      error: (err) => console.error(err)
    });
  }

  onFileSelect(event: any) {
    this.file = event.target.files[0];
  }

  upload() {

    if (!this.file || !this.logoName || !this.categoryId) {
      this.toast.warning('Please fill all required fields');
      return;
    }

    const formData = new FormData();

    formData.append('Name', this.logoName);
    formData.append('Image', this.file);

    formData.append('CategoryId', String(this.categoryId));

    // 🔥 IMPORTANT FIELDS
    formData.append('WidthPx', String(this.widthPx || 0));
    formData.append('HeightPx', String(this.heightPx || 0));

    this.service.createLogo(formData).subscribe({
      next: () => {
        this.toast.success('Logo uploaded successfully');

        // reset
        this.logoName = '';
        this.categoryId = null;
        this.file = null;
        this.widthPx = 100;
        this.heightPx = 100;

        this.router.navigate(['/admin/logos']);
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Upload failed');
      }
    });
  }

  cancel() {
    this.logoName = '';
    this.categoryId = null;
    this.file = null;
    this.widthPx = 100;
    this.heightPx = 100;
  }
}
