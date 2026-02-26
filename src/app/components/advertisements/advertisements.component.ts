

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
newAd = {
  title: '',
  highestBid: 0,
  imageFile: null as File | null, // لتخزين الملف الفعلي
  imagePreview: '' // للمعاينة فقط في الـ HTML
};
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
      this.advertisements = data;
      this.ads.set(data); // دي اللي بتشغل الـ filteredAds()
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


  onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.newAd.imageFile = file;
    // للمعاينة في الصفحة
    const reader = new FileReader();
    reader.onload = (e: any) => this.newAd.imagePreview = e.target.result;
    reader.readAsDataURL(file);
  }
}

addNewAdvertisement() {
  if (!this.newAd.title || !this.newAd.imageFile) return;

  const formData = new FormData();

  // الأسماء لازم تطابق الـ Backend (الـ Postman وضح إن Image مطلوبة)
  formData.append('Title', this.newAd.title);
  formData.append('HighestBid', this.newAd.highestBid.toString());
  formData.append('Image', this.newAd.imageFile);

  // إضافة كود الدولة عشان الإعلان يظهر في الدولة الصح
  formData.append('CountryCode', this.selectedCountry().code);

  this.apiService.addAdvertisement(formData).subscribe({
    next: (res) => {
      console.log('تم النشر بنجاح', res);

      // 1. تحديث القائمة فوراً بدون عمل Refresh للصفحة
      this.ads.set([...this.ads(), res]);
      this.advertisements = [...this.advertisements, res];

      // 2. تصفير البيانات لإضافة إعلان جديد لاحقاً
      this.resetNewAdForm();

      // 3. قفل المودال
      this.closeModal();
    },
    error: (err) => {
      console.error('خطأ في الإرسال:', err);
      alert('حدث خطأ أثناء إضافة الإعلان، تأكد من البيانات.');
    }
  });
}

// ميثود مساعدة لتنظيف الفورم
resetNewAdForm() {
  this.newAd = {
    title: '',
    highestBid: 0,
    imageFile: null,
    imagePreview: ''
  };
}

}
