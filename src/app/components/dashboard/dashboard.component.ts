import { Component, signal, computed, effect, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { gsap } from 'gsap';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../Services/api.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  isModalOpen = signal(false);
  isEditMode = signal(false);
  currentProduct = { id: 0, name: '', price: 0, quantity: 0, countryCode: '' }; // أضفنا كود الدولة هنا
  lastScrollTop = 0;
  isMenuVisible = true;
  isCountryModalOpen = signal(false);
  products = signal<any[]>(this.loadFromStorage());
  isSidebarOpen = signal(false);
  isRadialOpen = signal(false);
  @ViewChild('radialStage') radialStage?: ElementRef<HTMLElement>;
  mobileNav: Array<{ label: string; icon: string; path: string; exact?: boolean; logout?: boolean }> = [
    { label: 'الرئيسية', icon: 'bi-grid-1x2-fill', path: '/dashboard/home', exact: true },
    { label: 'المنتجات', icon: 'bi-bag-heart-fill', path: '/dashboard/products' },
    { label: 'المزادات', icon: 'bi-cash-coin', path: '/dashboard/auctions' },
    { label: 'الاعلانات', icon: 'bi-bullseye', path: '/dashboard/ads' },
    { label: 'الشركات', icon: 'bi-building-fill', path: '/dashboard/comp' },
    { label: 'البلاد', icon: 'bi-globe', path: '/dashboard/count' },
    { label: 'خروج', icon: 'bi-box-arrow-left', path: '/login', logout: true },
  ];
  private radialTl: gsap.core.Timeline | null = null;
  private radialCtx?: gsap.Context;
  private routerSub?: Subscription;
  private radialBusy = false;
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
    this.loadCountries();
    this.routerSub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isRadialOpen()) this.closeRadial();
    });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    this.radialTl?.kill();
    this.radialCtx?.revert();
    document.body.style.overflow = 'auto';
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

constructor(private apiService: ApiService, private router: Router) {
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
  this.toggleRadial();
}

toggleRadial() {
  if (this.isRadialOpen()) {
    this.closeRadial();
  } else {
    this.openRadial();
  }
}

openRadial() {
  if (this.radialBusy) return;
  this.isRadialOpen.set(true);
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    const stage = this.radialStage?.nativeElement;
    if (!stage) return;

    this.radialTl?.kill();
    this.radialCtx?.revert();
    this.radialCtx = gsap.context(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const items = stage.querySelectorAll<HTMLElement>('.radial-item');
      const disc = stage.querySelector<HTMLElement>('.radial-disc');
      const fabIcon = stage.querySelector('.radial-fab i');
      const count = items.length || 1;
      const first = items[0];
      const originX = first.offsetLeft + first.offsetWidth / 2;
      const originY = first.offsetTop + first.offsetHeight / 2;
      const discW = disc?.offsetWidth || 320;
      const cx = (disc ? disc.offsetLeft + discW / 2 : 0) - originX;
      const cy = (disc ? disc.offsetTop + discW / 2 : 0) - originY;
      const ringR = discW / 2 - 58;
      const startDeg = 58;
      const endDeg = 302;

      items.forEach((el, i) => {
        const deg = startDeg + ((endDeg - startDeg) * i) / Math.max(count - 1, 1);
        const rad = deg * (Math.PI / 180);
        el.style.setProperty('--x', `${cx + Math.cos(rad) * ringR}px`);
        el.style.setProperty('--y', `${cy + Math.sin(rad) * ringR}px`);
      });

      this.radialTl = gsap.timeline({ defaults: { ease: 'back.out(1.6)' } });
      this.radialTl
        .fromTo('.radial-backdrop', { autoAlpha: 0 }, { autoAlpha: 1, duration: reduce ? 0 : 0.22 }, 0)
        .fromTo(disc, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: reduce ? 0 : 0.42, ease: 'back.out(1.4)' }, 0)
        .fromTo(items, {
          autoAlpha: 0,
          scale: 0.35,
          x: 0,
          y: 0
        }, {
          autoAlpha: 1,
          scale: 1,
          x: (i: number, el: HTMLElement) => parseFloat(el.style.getPropertyValue('--x')) || 0,
          y: (i: number, el: HTMLElement) => parseFloat(el.style.getPropertyValue('--y')) || 0,
          duration: reduce ? 0 : 0.42,
          stagger: reduce ? 0 : 0.045
        }, 0.08)
        .to(fabIcon, { rotate: 180, duration: reduce ? 0 : 0.28, ease: 'power2.out' }, 0);
    }, stage);
  });
}

closeRadial() {
  if (!this.isRadialOpen() || this.radialBusy) return;
  this.radialBusy = true;

  const stage = this.radialStage?.nativeElement;
  const finish = () => {
    this.isRadialOpen.set(false);
    this.radialBusy = false;
    document.body.style.overflow = 'auto';
  };

  if (!stage) {
    finish();
    return;
  }

  this.radialTl?.kill();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = stage.querySelectorAll<HTMLElement>('.radial-item');
  const disc = stage.querySelector('.radial-disc');
  const fabIcon = stage.querySelector('.radial-fab i');

  this.radialTl = gsap.timeline({
    defaults: { ease: 'power2.in' },
    onComplete: finish
  });
  this.radialTl
    .to(items, { autoAlpha: 0, scale: 0.4, x: 0, y: 0, duration: reduce ? 0 : 0.22, stagger: reduce ? 0 : 0.02 }, 0)
    .to(disc, { scale: 0, autoAlpha: 0, duration: reduce ? 0 : 0.22 }, 0)
    .to('.radial-backdrop', { autoAlpha: 0, duration: reduce ? 0 : 0.2 }, 0)
    .to(fabIcon, { rotate: 0, duration: reduce ? 0 : 0.2, ease: 'power2.in' }, 0);
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
    if (this.isRadialOpen() || window.innerWidth > 992) return;
    const st = window.pageYOffset || document.documentElement.scrollTop;
    gsap.to('.radial-fab', { y: st > this.lastScrollTop ? 90 : 0, duration: 0.28 });
    this.lastScrollTop = st <= 0 ? 0 : st;
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 992 && this.isRadialOpen()) {
      this.closeRadial();
    }
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
