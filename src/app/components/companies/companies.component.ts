import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../../Services/api.service';

@Component({
  selector: 'app-companies',
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss']
})
export class CompaniesComponent implements OnInit {
  companies = signal<any[]>([]);
  isLoading = signal(true);
  countries: any[] = [];

  isAddModalOpen = false;
  isEditModalOpen = false;


  addModel = {
    Name: '',
    Description: '',
    HowToEarnPoints: '',
    Tier: 1,
    CountryId: 1
  };

  // نموذج التعديل
  editModel = {
    Id: 0,
    Name: '',
    Description: '',
    HowToEarnPoints: '',
    Tier: 1,
    CountryId: 1,
    imageUrl: ''
  };

  imagePreview: string | null = null;
  selectedFile: File | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.fetchCompanies();
    this.fetchCountries();
  }

  fetchCompanies() {
    this.isLoading.set(true);
    this.apiService.getCompanies().subscribe({
      next: (res) => { this.companies.set(res); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  fetchCountries() {
    this.apiService.getCountries().subscribe(res => this.countries = res);
  }

  // --- التحكم في المودال ---
  openAddModal() {
    this.resetState();
    this.isAddModalOpen = true;
    this.toggleBodyScroll(true);
  }

  closeAddModal() {
    this.isAddModalOpen = false;
    this.toggleBodyScroll(false);
  }

  openEditModal(company: any) {
    this.resetState();
    this.editModel = {
      Id: company.id,
      Name: company.name,
      Description: company.description,
      HowToEarnPoints: company.howToEarnPoints,
      Tier: company.tier,
      CountryId: company.countryId,
      imageUrl: company.imageUrl
    };
    this.imagePreview = company.imageUrl;
    this.isEditModalOpen = true;
    this.toggleBodyScroll(true);
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.toggleBodyScroll(false);
  }


  // --- العمليات ---
  saveNewCompany() {
    if (!this.selectedFile) {
      alert("يرجى رفع صورة الشركة أولاً");
      return;
    }

    const formData = new FormData();
    formData.append('Name', this.addModel.Name);
    formData.append('Description', this.addModel.Description);
    formData.append('HowToEarnPoints', this.addModel.HowToEarnPoints);
    formData.append('Tier', this.addModel.Tier.toString());
    formData.append('CountryId', this.addModel.CountryId.toString());
    formData.append('Image', this.selectedFile);

    this.apiService.addCompany(formData).subscribe({
      next: () => { this.closeAddModal(); this.fetchCompanies(); },
      error: (err) => console.error(err)
    });
  }

updateCompany() {
    // استخدام الدالة المساعدة التي أصلحناها لتجنب خطأ null.toString()
    const formData = this.prepareFormData(this.editModel);

    this.apiService.updateCompany(this.editModel.Id, formData).subscribe({
      next: () => {
        this.closeEditModal();
        this.fetchCompanies();
      },
      error: (err) => {
        console.error('Update failed', err);
        alert("حدث خطأ أثناء التحديث، تأكد من البيانات");
      }
    });
  }

  onDelete(id: number) {
    if(confirm('هل أنت متأكد؟')) {
      this.apiService.deleteCompany(id).subscribe(() => this.fetchCompanies());
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => this.imagePreview = e.target.result;
      reader.readAsDataURL(file);
    }
  }

private prepareFormData(model: any): FormData {
  const formData = new FormData();


  Object.keys(model).forEach(key => {
    const value = model[key];
    if (value !== null && value !== undefined && key !== 'imageUrl') {
      formData.append(key, value.toString());
    }
  });

  if (this.selectedFile) {
    formData.append('Image', this.selectedFile);
  }

  return formData;
}

  private resetState() {
    this.addModel = {
      Name: '',
      Description: '',
      HowToEarnPoints: '',
      Tier: 1,
      CountryId: 1
    };
    this.imagePreview = null;
    this.selectedFile = null;
  }


  private toggleBodyScroll(isLocked: boolean) {
    document.body.style.overflow = isLocked ? 'hidden' : 'auto';
  }
}
