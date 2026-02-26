

import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { gsap } from 'gsap';
import { register } from 'swiper/element/bundle';
import { ApiService } from '../../Services/api.service';

register();

@Component({
  selector: 'app-advertisements',
  templateUrl: './advertisements.component.html',
  styleUrls: ['./advertisements.component.scss'],
})
export class AdvertisementsComponent
  implements OnInit, AfterViewInit, OnDestroy
{

  constructor(private apiService: ApiService) {}

  private getSavedCountry() {
    const data = localStorage.getItem('selected_country');
    return data
      ? JSON.parse(data)
      : { name: 'مصر', code: 'EG', flag: '🇪🇬', currency: 'ج.م' };
  }

  selectedCountry = signal(this.getSavedCountry());
  showAddModal = false;
  newAd = { title: '', highestBid: '', image: null as string | null };
  selectedFile: File | null = null;
  isMobile: boolean = false;

  // تعريف الـ Signal كصفوفة فارغة في البداية
  ads = signal<any[]>([]);

  // فلترة الإعلانات القادمة من الـ API
  filteredAds = computed(() => {
    const code = this.selectedCountry().code;
    return this.ads().filter(
      (ad) => ad.countryCode === code || ad.countryCode === 'ALL',
    );
  });

  currentIndex = 0;
  sliderInterval: any;

  ngOnInit() {
    this.checkScreenSize();
    this.loadAds(); // جلب البيانات عند التشغيل

    window.addEventListener('storage', (event) => {
      if (event.key === 'selected_country') this.updateComponentData();
    });

    window.addEventListener('countryChanged', () => this.updateComponentData());
  }
  advertisements: any[] = [];
  // ميثود جلب البيانات من السيرفر
  loadAds() {
    this.apiService.getAdvertisements().subscribe({
      next: (data) => {
        console.log(data);
        this.advertisements = data;
        // تحديث الـ Signal بالبيانات الحقيقية
        // this.ads.set(data);
      },
      error: (err) => console.error('Error fetching ads:', err),
    });
  }

  deleteAd(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
      this.apiService.deleteAdvertisement(id).subscribe({
        next: () => {
          // تحديث الواجهة بحذف العنصر من الـ Signal
          this.ads.set(this.ads().filter((ad) => ad.id !== id));
        },
        error: (err) => console.error('Delete failed:', err),
      });
    }
  }

  updateComponentData() {
    this.selectedCountry.set(this.getSavedCountry());
    this.currentIndex = 0;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
  }

  ngAfterViewInit(): void {
    this.startAutoPlay();
    this.animateContentOnLoad();
  }

  animateContentOnLoad() {
    setTimeout(() => {
      const tl = gsap.timeline();
      tl.from('.hero-slider', {
        y: -50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      }).from('.glass-header', { x: 30, opacity: 0, duration: 0.8 }, '-=0.5');
    }, 500);
  }

  startAutoPlay() {
    this.sliderInterval = setInterval(() => this.moveSlide(1), 5000);
  }

  moveSlide(direction: number) {
    const currentSlides = this.filteredAds();
    if (currentSlides.length <= 1) return;
    this.currentIndex =
      (this.currentIndex + direction + currentSlides.length) %
      currentSlides.length;
  }

  ngOnDestroy(): void {
    if (this.sliderInterval) clearInterval(this.sliderInterval);
  }

  openModal() {
    this.showAddModal = true;
  }
  closeModal() {
    this.showAddModal = false;
  }
}
