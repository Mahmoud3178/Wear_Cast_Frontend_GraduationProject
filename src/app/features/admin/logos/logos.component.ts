import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminLogosService } from '../../../core/services/admin-logos.service';

@Component({
  selector: 'app-logos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './logos.component.html',
  styleUrl: './logos.component.css'
})
export class LogosComponent implements OnInit {

  logos: any[] = [];
  categories: any[] = [];

selectedCategory: number | null = null;
  selectedLogo: any = null;

  searchTerm: string = '';

  constructor(private service: AdminLogosService) {}

  ngOnInit() {
    this.loadCategories();
  }

  // 🔹 Load Categories
loadCategories() {
  this.service.getCategories().subscribe({
    next: (res: any) => {
      this.categories = res?.data || [];

      // 🔥 خليه ALL افتراضي
      this.selectedCategory = null;

      this.loadLogos();
    }
  });
}
  // 🔹 Load Logos
loadLogos() {

  this.service.getAssets(this.selectedCategory ?? undefined).subscribe({
    next: (res: any) => {

      // حسب الـ API بتاعك
      this.logos = res?.data?.items || res?.data || [];

    }
  });

}
  // 🔹 Filter by category
  onCategoryChange() {
    this.loadLogos();
  }

  // 🔹 Open Offcanvas
openLogo(logo: any) {
  this.selectedLogo = {
    ...logo,
    widthPx: logo.widthPx || 100,
    heightPx: logo.heightPx || 100
  };
}

  // 🔹 Delete
  deleteLogo(id: number) {
    this.service.deleteLogo(id).subscribe({
      next: () => {
        this.logos = this.logos.filter(l => l.id !== id);
        this.selectedLogo = null;
      }
    });
  }

  // 🔹 Update
updateLogo() {
  if (!this.selectedLogo) return;

  const formData = new FormData();
  formData.append('Name', this.selectedLogo.name || '');
  formData.append('WidthPx', this.selectedLogo.widthPx || 0);
  formData.append('HeightPx', this.selectedLogo.heightPx || 0);

  // 🔥 الصح هنا
  formData.append('CategoryId', this.selectedLogo.categoryId?.toString());

  this.service.updateLogo(this.selectedLogo.id, formData).subscribe({
    next: () => {
      this.loadLogos();
    }
  });
}

  // 🔹 Search filter
  get filteredLogos() {
    return this.logos.filter(l =>
      l.name?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
