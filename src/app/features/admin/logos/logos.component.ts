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
  newCategoryName: string = '';

  // 🔥 ADD LOGO MODEL
  newLogo = {
    name: '',
    widthPx: 100,
    heightPx: 100,
    categoryId: 0,
    image: null as File | null
  };

  constructor(private service: AdminLogosService) {}

  ngOnInit() {
    this.loadCategories();
  }

  // ================= LOAD =================
  loadCategories() {
    this.service.getCategories().subscribe({
      next: (res: any) => {
        this.categories = res?.data || [];
        this.selectedCategory = null;
        this.loadLogos();
      }
    });
  }

  loadLogos() {
    this.service.getAssets(this.selectedCategory ?? undefined).subscribe({
      next: (res: any) => {
        this.logos = res?.data?.items || res?.data || [];
      }
    });
  }

  onCategoryChange() {
    this.loadLogos();
  }

  // ================= CATEGORY =================
  addCategory() {
    if (!this.newCategoryName.trim()) return;

    this.service.addCategory({ name: this.newCategoryName }).subscribe({
      next: () => {
        this.newCategoryName = '';
        this.loadCategories();
      }
    });
  }

  // ================= ADD LOGO =================
  onCreateFileChange(event: any) {
    const file = event.target.files[0];
    if (file) this.newLogo.image = file;
  }

  createLogo() {

    const formData = new FormData();

    formData.append('Name', this.newLogo.name || '');
    formData.append('WidthPx', String(this.newLogo.widthPx || 0));
    formData.append('HeightPx', String(this.newLogo.heightPx || 0));
    formData.append('CategoryId', String(this.newLogo.categoryId || 0));

    if (this.newLogo.image) {
      formData.append('Image', this.newLogo.image);
    }

    this.service.createLogo(formData).subscribe({
      next: () => {
        this.loadLogos();

        // reset
        this.newLogo = {
          name: '',
          widthPx: 100,
          heightPx: 100,
          categoryId: 0,
          image: null
        };
      }
    });
  }

  // ================= OPEN =================
  openLogo(logo: any) {
    this.selectedLogo = {
      ...logo,
      widthPx: logo.widthPx || 100,
      heightPx: logo.heightPx || 100
    };
  }

  closePanel() {
    const panel = document.getElementById('logoPanel');
    const bs = (window as any).bootstrap?.Offcanvas.getInstance(panel!);
    bs?.hide();
    this.selectedLogo = null;
  }

  // ================= DELETE =================
  deleteLogo(id: number) {
    if (!confirm('Delete this logo?')) return;

    this.service.deleteLogo(id).subscribe({
      next: () => {
        this.logos = this.logos.filter(l => l.id !== id);
        this.closePanel();
      }
    });
  }

  // ================= UPDATE =================
  onLogoFileChange(event: any) {
    const file = event.target.files[0];
    if (file) this.selectedLogo.newImage = file;
  }

  updateLogo() {

    const formData = new FormData();

    formData.append('Name', this.selectedLogo.name || '');
    formData.append('WidthPx', String(this.selectedLogo.widthPx || 0));
    formData.append('HeightPx', String(this.selectedLogo.heightPx || 0));
    formData.append('CategoryId', String(this.selectedLogo.categoryId || 0));

    if (this.selectedLogo.newImage) {
      formData.append('Image', this.selectedLogo.newImage);
    }

    this.service.updateLogo(this.selectedLogo.id, formData).subscribe({
      next: () => {
        this.loadLogos();
        this.closePanel();
      }
    });
  }

  // ================= SEARCH =================
  get filteredLogos() {
    return this.logos.filter(l =>
      l.name?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
