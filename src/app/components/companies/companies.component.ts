import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../../Services/api.service';

interface CompanyBranch {
  name: string;
  address: string;
  workingHours: string;
}

interface CompanyForm {
  id: number | null;
  name: string;
  description: string;
  detailedDescription: string;
  howToEarnPoints: string;
  tier: number;
  phoneNumber: string;
  countryId: number | null;
  websiteUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  tikTokUrl: string;
  googlePlayUrl: string;
  appStoreUrl: string;
  imageUrl: string;
  branches: CompanyBranch[];
}

type LinkKey = 'websiteUrl' | 'facebookUrl' | 'instagramUrl' | 'tikTokUrl' | 'googlePlayUrl' | 'appStoreUrl';

@Component({
  selector: 'app-companies',
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss']
})
export class CompaniesComponent implements OnInit {
  companies = signal<any[]>([]);
  isLoading = signal(true);
  countries: any[] = [];

  isModalOpen = false;
  modalMode: 'add' | 'edit' = 'add';
  isSaving = false;
  form: CompanyForm = this.emptyForm();

  imagePreview: string | null = null;
  selectedFile: File | null = null;

  readonly tierOptions = [
    { value: 0, label: 'Bronze', hint: 'المستوى الأساسي', icon: 'bi-award' },
    { value: 1, label: 'Silver', hint: 'مستوى فضي', icon: 'bi-award' },
    { value: 2, label: 'Gold', hint: 'مستوى ذهبي', icon: 'bi-award-fill' },
    { value: 3, label: 'Platinum', hint: 'المستوى الأعلى', icon: 'bi-gem' }
  ];

  readonly linkFields: Array<{ key: LinkKey; label: string; icon: string; placeholder: string }> = [
    { key: 'websiteUrl', label: 'الموقع الإلكتروني', icon: 'bi-globe2', placeholder: 'https://example.com' },
    { key: 'facebookUrl', label: 'فيسبوك', icon: 'bi-facebook', placeholder: 'https://facebook.com/...' },
    { key: 'instagramUrl', label: 'إنستجرام', icon: 'bi-instagram', placeholder: 'https://instagram.com/...' },
    { key: 'tikTokUrl', label: 'تيك توك', icon: 'bi-tiktok', placeholder: 'https://tiktok.com/@...' },
    { key: 'googlePlayUrl', label: 'Google Play', icon: 'bi-google-play', placeholder: 'https://play.google.com/...' },
    { key: 'appStoreUrl', label: 'App Store', icon: 'bi-apple', placeholder: 'https://apps.apple.com/...' }
  ];

  get countryOptions() {
    return (this.countries || []).map(country => ({
      value: country.id,
      label: country.name,
      hint: country.currency,
      icon: 'bi-geo-alt'
    }));
  }

  get isEdit() {
    return this.modalMode === 'edit';
  }

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

  openAddModal() {
    this.modalMode = 'add';
    this.form = this.emptyForm();
    this.imagePreview = null;
    this.selectedFile = null;
    this.openModal();
  }

  openEditModal(company: any) {
    this.modalMode = 'edit';
    this.form = {
      id: company.id,
      name: company.name || '',
      description: company.description || '',
      detailedDescription: company.detailedDescription || '',
      howToEarnPoints: company.howToEarnPoints || '',
      tier: company.tier ?? 0,
      phoneNumber: company.phoneNumber || '',
      countryId: company.countryId ?? null,
      websiteUrl: company.websiteUrl || '',
      facebookUrl: company.facebookUrl || '',
      instagramUrl: company.instagramUrl || '',
      tikTokUrl: company.tikTokUrl || '',
      googlePlayUrl: company.googlePlayUrl || '',
      appStoreUrl: company.appStoreUrl || '',
      imageUrl: company.imageUrl || '',
      branches: (company.branches || []).map((branch: any) => ({
        name: branch.name || '',
        address: branch.address || '',
        workingHours: branch.workingHours || ''
      }))
    };
    this.imagePreview = company.imageUrl || null;
    this.selectedFile = null;
    this.openModal();
  }

  closeModal() {
    this.isModalOpen = false;
    this.toggleBodyScroll(false);
  }

  addBranch() {
    this.form.branches.push({ name: '', address: '', workingHours: '' });
  }

  removeBranch(index: number) {
    this.form.branches.splice(index, 1);
  }

  saveCompany() {
    if (!this.form.name.trim()) {
      alert('اكتب اسم الشركة');
      return;
    }
    if (!this.form.countryId) {
      alert('اختار الدولة');
      return;
    }
    if (!this.isEdit && !this.selectedFile) {
      alert('يرجى رفع صورة الشركة أولاً');
      return;
    }

    const formData = this.buildFormData();
    const request = this.isEdit
      ? this.apiService.updateCompany(this.form.id as number, formData)
      : this.apiService.addCompany(formData);

    this.isSaving = true;
    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.fetchCompanies();
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Save company failed', err);
        alert('حدث خطأ أثناء الحفظ، تأكد من البيانات');
      }
    });
  }

  onDelete(id: number) {
    if (confirm('هل أنت متأكد؟')) {
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

  // PUT replaces the whole company: any field left out is cleared and branches are replaced.
  private buildFormData(): FormData {
    const f = this.form;
    const formData = new FormData();
    const text: Array<[string, string]> = [
      ['Name', f.name],
      ['Description', f.description],
      ['DetailedDescription', f.detailedDescription],
      ['HowToEarnPoints', f.howToEarnPoints],
      ['PhoneNumber', f.phoneNumber],
      ['WebsiteUrl', f.websiteUrl],
      ['FacebookUrl', f.facebookUrl],
      ['InstagramUrl', f.instagramUrl],
      ['TikTokUrl', f.tikTokUrl],
      ['GooglePlayUrl', f.googlePlayUrl],
      ['AppStoreUrl', f.appStoreUrl]
    ];

    if (f.id) formData.append('Id', String(f.id));
    text.forEach(([key, value]) => formData.append(key, (value || '').trim()));
    formData.append('Tier', String(f.tier ?? 0));
    formData.append('CountryId', String(f.countryId));

    f.branches
      .filter(branch => branch.name.trim() || branch.address.trim() || branch.workingHours.trim())
      .forEach((branch, index) => {
        formData.append(`Branches[${index}].Name`, branch.name.trim());
        formData.append(`Branches[${index}].Address`, branch.address.trim());
        formData.append(`Branches[${index}].WorkingHours`, branch.workingHours.trim());
      });

    if (this.selectedFile) {
      formData.append('Image', this.selectedFile);
    }

    return formData;
  }

  private emptyForm(): CompanyForm {
    return {
      id: null,
      name: '',
      description: '',
      detailedDescription: '',
      howToEarnPoints: '',
      tier: 0,
      phoneNumber: '',
      countryId: this.selectedCountryId(),
      websiteUrl: '',
      facebookUrl: '',
      instagramUrl: '',
      tikTokUrl: '',
      googlePlayUrl: '',
      appStoreUrl: '',
      imageUrl: '',
      branches: []
    };
  }

  private selectedCountryId(): number | null {
    try {
      return JSON.parse(localStorage.getItem('selected_country') || 'null')?.id ?? null;
    } catch {
      return null;
    }
  }

  private openModal() {
    this.isModalOpen = true;
    this.toggleBodyScroll(true);
  }

  private toggleBodyScroll(isLocked: boolean) {
    document.body.style.overflow = isLocked ? 'hidden' : 'auto';
  }
}
