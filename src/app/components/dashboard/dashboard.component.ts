import { Component, signal, computed, effect, OnInit } from '@angular/core';
import { HostListener } from '@angular/core';
import { gsap } from 'gsap';
import { ApiService } from '../../Services/api.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  isModalOpen = signal(false);
  isEditMode = signal(false);
  currentProduct = { id: 0, name: '', price: 0, quantity: 0, countryCode: '' }; // أضفنا كود الدولة هنا
  lastScrollTop = 0;
  isMenuVisible = true;
  isCountryModalOpen = signal(false);
  products = signal<any[]>(this.loadFromStorage());
  isSidebarOpen = signal(false);
selectedCountry = signal<any>(null)
  // تحديث قائمة الدول لتشمل العملات
countries = signal<any[]>([]);

  // تحميل الدولة المختارة من التخزين
  // selectedCountry = signal(this.loadCountryFromStorage());

  // --- منطق الذكاء: فلترة البيانات حسب الدولة المختارة ---
  filteredProducts = computed(() => {
    const country = this.selectedCountry();
    return this.products().filter(p => p.countryCode === country.code);
  });

  totalProducts = computed(() => this.filteredProducts().length);

  totalInventoryValue = computed(() =>
    this.filteredProducts().reduce((acc, curr) => acc + (Number(curr.price) || 0), 0)
  );

ngOnInit() {
    this.loadCountries(); // نده السيرفس عند البداية
  }

  // 3. ميثود جلب البيانات من السيرفس
  loadCountries() {
    this.apiService.getCountries().subscribe({
      next: (data) => {
        this.countries.set(data);

        // لو في دولة متسيفة في الـ Storage رجعها، لو مفيش خد أول واحدة من الـ API
        const saved = localStorage.getItem('selected_country');
        if (saved) {
          this.selectedCountry.set(JSON.parse(saved));
        } else if (data.length > 0) {
          this.selectCountry(data[0]);
        }
      },
      error: (err) => console.error('Error fetching countries:', err)
    });
  }

constructor(private apiService: ApiService) {
    effect(() => {
      if (this.selectedCountry()) {
        localStorage.setItem('selected_country', JSON.stringify(this.selectedCountry()));
      }
    });
  }

selectCountry(country: any) {
    this.selectedCountry.set(country);
    localStorage.setItem('selected_country', JSON.stringify(country));

    // إبلاغ بقية الموقع بالتغيير
    window.dispatchEvent(new Event('countryChanged'));
    this.closeCountryModal();
  }

openCountryModal() {
  this.isCountryModalOpen.set(true);

  // نستخدم requestAnimationFrame أو Timeout صغير لضمان وجود العنصر في الـ DOM
  setTimeout(() => {
    const isMobile = window.innerWidth <= 768;
    // استهداف كلاس خاص بمودال الدول فقط
    gsap.fromTo('.country-modal-overlay', { opacity: 0 }, { opacity: 1, duration: 0.3 });

    if (isMobile) {
      gsap.fromTo('.mobile-sheet',
        { y: '100%' },
        { y: 0, duration: 0.6, ease: "power4.out" }
      );
    } else {
      gsap.fromTo('.mobile-sheet',
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    }
  }, 50);
}

closeCountryModal() {
  const isMobile = window.innerWidth <= 768;

  // أنيميشن الإغلاق
  if (isMobile) {
    gsap.to('.mobile-sheet', { y: '100%', duration: 0.4, ease: "power4.in" });
  } else {
    gsap.to('.mobile-sheet', { scale: 0.8, opacity: 0, duration: 0.3 });
  }

  gsap.to('.country-modal-overlay', {
    opacity: 0,
    duration: 0.3,
    onComplete: () => {
      this.isCountryModalOpen.set(false);
      // أهم سطر لفك شلل الصفحة
      document.body.style.overflow = 'auto';
    }
  });
}

  loadAuctionsByCountry(countryCode: string) {
    console.log("تم تحديث البيانات لدولة: ", countryCode);
  }

toggleSidebar() {
  this.isSidebarOpen.set(!this.isSidebarOpen());

  if (this.isSidebarOpen()) {
    // أنيميشن فتح السايد بار فقط
    gsap.to('.app-sidebar', {
      x: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out'
    });

  } else {
    // أنيميشن إغلاق السايد بار
    gsap.to('.app-sidebar', {
      x: '100%',
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in'
    });
  }
}
  addNewProduct(newProd: any) {
    const productWithId = {
      id: Date.now(),
      name: newProd.name || 'منتج جديد',
      price: newProd.price || 0,
      quantity: newProd.quantity || 0,
      date: new Date(),
      countryCode: this.selectedCountry().code
    };
    this.products.update(prev => [productWithId, ...prev]);
  }

  deleteProduct(id: number) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      this.products.update(prev => prev.filter(p => p.id !== id));
    }
  }

  private loadFromStorage(): any[] {
    const data = localStorage.getItem('my_products');
    return data ? JSON.parse(data) : [];
  }


  @HostListener('window:scroll', [])
  onWindowScroll() {
    const st = window.pageYOffset || document.documentElement.scrollTop;
    if (st > this.lastScrollTop) {
      gsap.to('.fixed-menu-btn', { y: 100, duration: 0.3 });
    } else {
      gsap.to('.fixed-menu-btn', { y: 0, duration: 0.3 });
    }
    this.lastScrollTop = st <= 0 ? 0 : st;
  }

  openEditModal(product: any) {

  this.isCountryModalOpen.set(false);
  this.isEditMode.set(true);
  this.currentProduct = { ...product };
  this.isModalOpen.set(true);


  document.body.style.overflow = 'hidden';
}

closeModal() {
  this.isModalOpen.set(false);
  document.body.style.overflow = 'auto';
}
  saveProduct() {
    if (this.isEditMode()) {
      this.products.update(prev =>
        prev.map(p => p.id === this.currentProduct.id ? { ...this.currentProduct } : p)
      );
    } else {
      const newProd = {
        ...this.currentProduct,
        id: Date.now(),
        date: new Date(),
        countryCode: this.selectedCountry().code
      };
      this.products.update(prev => [newProd, ...prev]);
    }
    this.closeModal();
  }
}
