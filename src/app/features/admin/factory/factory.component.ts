import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FactoryForAdminService } from '../../../core/services/factory-for-admin.service';

@Component({
  selector: 'app-factory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './factory.component.html',
  styleUrl: './factory.component.css'
})
export class FactoryComponent implements OnInit {

  factory: any;
  loading = true;
  editMode = false;

  selectedFile!: File;

  form: any = {
    name: '',
    email: '',
    phoneNumber: '',
    commercialRegisterNumber: '',
    taxIdNumber: '',
    description: ''
  };

  constructor(private service: FactoryForAdminService) {}

  ngOnInit(): void {
    this.loadFactory(1); // 👈 غيرها حسب ID
  }

  loadFactory(id: number) {
    this.loading = true;

    this.service.getFactoryProfile(id).subscribe({
      next: (res: any) => {
        this.factory = res?.data || res;

        this.form = {
          name: this.factory?.name,
          email: this.factory?.email,
          phoneNumber: this.factory?.phoneNumber,
          commercialRegisterNumber: this.factory?.commercialRegisterNumber,
          taxIdNumber: this.factory?.taxIdNumber,
          description: this.factory?.description
        };

        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  toggleEdit() {
    this.editMode = !this.editMode;
  }

  save() {
    this.service.updateFactoryProfile(this.form).subscribe(() => {
      this.editMode = false;
      this.loadFactory(this.factory.id);
    });
  }

  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadLogo() {
    if (!this.selectedFile) return;

    this.service.updateFactoryImage(this.factory.id, this.selectedFile)
      .subscribe(() => {
        this.loadFactory(this.factory.id);
      });
  }

  deleteFactory() {
    alert('Delete API not ready yet 🚧');
  }
}
