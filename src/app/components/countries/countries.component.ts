import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../Services/api.service'; // تأكد من المسار الصحيح
import { gsap } from 'gsap';

@Component({
  selector: 'app-countries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss']
})
export class CountriesComponent implements OnInit {
  isModalOpen = false;
  modalMode: 'add' | 'edit' = 'add';
  catNameModel = '';
  catCurrencyModel = ''; 
  editingId: number | null = null;
  countries: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadCountries();
  }

  loadCountries() {
    this.apiService.getCountries().subscribe({
      next: (data) => {
        this.countries = data;
        this.animateCards();
      },
      error: (err) => console.error('خطأ في جلب البيانات', err)
    });
  }

  animateCards() {
    setTimeout(() => {
      gsap.fromTo('.category-item',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }
      );
    }, 100);
  }

  openModal(mode: 'add' | 'edit', country?: any) {
    this.modalMode = mode;
    this.isModalOpen = true;

    if (mode === 'edit' && country) {
      this.catNameModel = country.name;
      this.catCurrencyModel = country.currency;
      this.editingId = country.id;
    } else {
      this.catNameModel = '';
      this.catCurrencyModel = '';
      this.editingId = null;
    }
  }

  saveCategory() {
    if (!this.catNameModel.trim()) return;

    const countryData = {
      name: this.catNameModel,
      currency: this.catCurrencyModel
    };

    if (this.modalMode === 'add') {
      this.apiService.addCountry(countryData).subscribe(() => {
        this.loadCountries();
        this.closeModal();
      });
    } else if (this.modalMode === 'edit' && this.editingId !== null) {
      this.apiService.updateCountry(this.editingId, countryData).subscribe(() => {
        this.loadCountries();
        this.closeModal();
      });
    }
  }

  deleteCategory(id: number, name: string) {
    if (confirm(`هل أنت متأكد من حذف دولة "${name}"؟`)) {
      this.apiService.deleteCountry(id).subscribe(() => {
        this.loadCountries();
      });
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }
}
