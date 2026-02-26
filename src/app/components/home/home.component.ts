
import { AfterViewInit, Component, inject, computed, signal, effect, OnDestroy } from '@angular/core';
import Swiper from 'swiper';
import { gsap } from 'gsap';
import { DashboardComponent } from '../dashboard/dashboard.component';

export interface AuctionItem {
  id: number;
  countryCode: string;
  status: 'active' | 'upcoming' | 'completed';
  name: string;
  officialPrice: number;
  img: string;
  currentBid: number;
  targetPrice: number;
  timeLeft: number;
  lastBidder: { name: string; isAi: boolean };
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements AfterViewInit, OnDestroy {
  // حقن DashboardComponent للوصول للدولة المختارة
  public dashboard = inject(DashboardComponent);

  imagePreview: string | null = null;
  selectedFile: File | null = null;
  selectedAuction: any = null;
  private timerInterval: any;

  // المتغير الأساسي للتحكم في ظهور المودال
isModalOpen = signal(false);

  selectedCountry = signal(this.getCountryFromStorage());
  showAddModal = false;
  isEditMode = false;
  selectedItem: any = null;

  newAuctionObj = {
    name: '',
    date: '',
    hours: 24,
    startPoints: 0,
    targetPoints: 0,
    officialPrice: 0,
    img: ''
  };


// داخل الكلاس الخاص بالـ Component
// swiperConfig: any = {
//   slidesPerView: 1,       // افتراضي للموبايل
//   spaceBetween: 15,      // المسافة للموبايل
//   centeredSlides: false,
//   loop: false,
//   pagination: { clickable: true },

//   // ضبط عدد الكروت بناءً على حجم الشاشة
//   breakpoints: {
//     // الشاشات الكبيرة (Desktop)
//     1200: {
//       slidesPerView: 4,
//       spaceBetween: 25
//     },
//     // الشاشات المتوسطة (Tablets)
//     768: {
//       slidesPerView: 2,
//       spaceBetween: 20
//     },
//     // الشاشات الصغيرة (Mobile) يتم تجاهلها لتأخذ القيمة الافتراضية 1
//   }
// };



  auctions = signal([
    { id: 1, name: 'MacBook Pro M3 Max', officialPrice: 185000, img: 'https://picsum.photos/id/0/600/400', startPrice: 500, targetPrice: 15000, currentBid: 12550, totalPoints: 18400, timeLeft: 43100, country: 'SA', lastBidder: { name: 'البوت الذكي', isAi: true, time: 'ثانيتين' } },
    { id: 3, name: 'PlayStation 5 Pro', officialPrice: 75000, img: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=500', startPrice: 200, targetPrice: 4500, currentBid: 3100, totalPoints: 5200, timeLeft: 7200, country: 'SA', lastBidder: { name: 'علي حسن', isAi: false, time: 'دقيقة' } },
    { id: 9, name: 'Samsung 75" Neo QLED', officialPrice: 75000, img: 'https://picsum.photos/id/231/600/400', startPrice: 1000, targetPrice: 12000, currentBid: 8500, totalPoints: 11000, timeLeft: 54000, country: 'SA', lastBidder: { name: 'البوت الذكي', isAi: true, time: 'لحظة' } },
    { id: 16, name: 'نظام صوتي Bose 700', officialPrice: 75000, img: 'https://picsum.photos/id/211/600/400', startPrice: 150, targetPrice: 3000, currentBid: 1800, totalPoints: 2500, timeLeft: 12000, country: 'SA', lastBidder: { name: 'سلطان محمد', isAi: false, time: '5 ثوانٍ' } },
    { id: 2, name: 'iPhone 15 Pro Max', officialPrice: 75000, img: 'https://m.media-amazon.com/images/I/81+GIkwqLIL._AC_SL1500_.jpg', startPrice: 300, targetPrice: 9500, currentBid: 8200, totalPoints: 10200, timeLeft: 3600, country: 'EG', lastBidder: { name: 'محمود شاكر', isAi: false, time: '5 ثوانٍ' } },
    { id: 5, name: 'iPad Air M2', officialPrice: 75000, img: 'https://picsum.photos/id/9/600/400', startPrice: 150, targetPrice: 5000, currentBid: 2800, totalPoints: 4000, timeLeft: 15000, country: 'EG', lastBidder: { name: 'سارة أحمد', isAi: false, time: '10 ثوانٍ' } },
    { id: 10, name: 'Canon R6 Mark II', officialPrice: 75000, img: 'https://picsum.photos/id/250/600/400', startPrice: 800, targetPrice: 18000, currentBid: 12400, totalPoints: 15000, timeLeft: 28000, country: 'EG', lastBidder: { name: 'البوت الذكي', isAi: true, time: '3 ثوانٍ' } },
    { id: 17, name: 'ثلاجة LG InstaView', officialPrice: 75000, img: 'https://picsum.photos/id/160/600/400', startPrice: 2000, targetPrice: 65000, currentBid: 42000, totalPoints: 50000, timeLeft: 86400, country: 'EG', lastBidder: { name: 'هاني رمزي', isAi: false, time: 'دقيقة' } },
    { id: 4, name: 'Samsung Galaxy S21 Ultra', officialPrice: 75000, img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=500', startPrice: 400, targetPrice: 8000, currentBid: 6500, totalPoints: 9100, timeLeft: 450000, country: 'AE', lastBidder: { name: 'البوت الذكي', isAi: true, time: 'لحظة' } },
    { id: 6, name: 'DJI Mavic 3 Pro', officialPrice: 75000, img: 'https://picsum.photos/id/26/600/400', startPrice: 1000, targetPrice: 20000, currentBid: 14200, totalPoints: 19000, timeLeft: 86400, country: 'AE', lastBidder: { name: 'جاسم محمد', isAi: false, time: 'دقيقة' } },
    { id: 11, name: 'Apple Watch Ultra 2', officialPrice: 75000, img: 'https://picsum.photos/id/20/600/400', startPrice: 300, targetPrice: 4500, currentBid: 3800, totalPoints: 5000, timeLeft: 12000, country: 'AE', lastBidder: { name: 'البوت الذكي', isAi: true, time: 'ثانية' } },
    { id: 18, name: 'Tesla Wall Connector', officialPrice: 75000, img: 'https://picsum.photos/id/102/600/400', startPrice: 500, targetPrice: 6000, currentBid: 4100, totalPoints: 5500, timeLeft: 21000, country: 'AE', lastBidder: { name: 'سعيد الفلاسي', isAi: false, time: '10 ثوانٍ' } },
    { id: 7, name: 'Dyson V15 Detect', officialPrice: 75000, img: 'https://picsum.photos/id/192/600/400', startPrice: 250, targetPrice: 3500, currentBid: 2100, totalPoints: 4000, timeLeft: 5400, country: 'KW', lastBidder: { name: 'البوت الذكي', isAi: true, time: '5 ثوانٍ' } },
    { id: 12, name: 'Nintendo Switch OLED', officialPrice: 75000, img: 'https://picsum.photos/id/180/600/400', startPrice: 100, targetPrice: 1800, currentBid: 1200, totalPoints: 2000, timeLeft: 8000, country: 'KW', lastBidder: { name: 'خالد السالم', isAi: false, time: '15 ثانية' } },
    { id: 13, name: 'Sony WH-1000XM5', officialPrice: 75000, img: 'https://picsum.photos/id/212/600/400', startPrice: 150, targetPrice: 2200, currentBid: 1850, totalPoints: 2500, timeLeft: 4300, country: 'KW', lastBidder: { name: 'البوت الذكي', isAi: true, time: 'لحظة' } },
    { id: 19, name: 'قهوة Breville Oracle', officialPrice: 75000, img: 'https://picsum.photos/id/103/600/400', startPrice: 800, targetPrice: 9000, currentBid: 6200, totalPoints: 8500, timeLeft: 32000, country: 'KW', lastBidder: { name: 'نواف العنزي', isAi: false, time: 'دقيقة' } },
    { id: 8, name: 'Canon EOS R5', officialPrice: 75000, img: 'https://picsum.photos/id/251/600/400', startPrice: 1500, targetPrice: 25000, currentBid: 18000, totalPoints: 22000, timeLeft: 72000, country: 'QA', lastBidder: { name: 'فهد الكواري', isAi: false, time: '30 ثانية' } },
    { id: 14, name: 'Alienware m18 Laptop', officialPrice: 75000, img: 'https://picsum.photos/id/161/600/400', startPrice: 2000, targetPrice: 28000, currentBid: 21000, totalPoints: 26000, timeLeft: 95000, country: 'QA', lastBidder: { name: 'البوت الذكي', isAi: true, time: '4 ثوانٍ' } },
    { id: 15, name: 'Asus ROG Ally', officialPrice: 75000, img: 'https://picsum.photos/id/101/600/400', startPrice: 300, targetPrice: 3500, currentBid: 2400, totalPoints: 3200, timeLeft: 11000, country: 'QA', lastBidder: { name: 'تميم جاسم', isAi: false, time: 'ثانية' } },
    { id: 20, name: 'هاتف Fold 5 Special', officialPrice: 75000, img: 'https://picsum.photos/id/104/600/400', startPrice: 400, targetPrice: 7500, currentBid: 5800, totalPoints: 6900, timeLeft: 15000, country: 'QA', lastBidder: { name: 'البوت الذكي', isAi: true, time: 'لحظة' } }
  ]);

  upcomingAuctions = signal([
    { id: 102, name: 'GoPro Hero 12', officialPrice: 75000, img: 'https://picsum.photos/id/257/600/400', startPrice: 800, targetPrice: 2200, startTime: '09:00 AM', startDate: '15 فبراير 2026', country: 'SA' },
    { id: 104, name: 'Nintendo Switch OLED', officialPrice: 75000, img: 'https://picsum.photos/id/201/600/400', startPrice: 150, targetPrice: 2000, startTime: '06:00 PM', startDate: '20 فبراير 2026', country: 'SA' },
    { id: 108, name: 'Steam Deck 512GB', officialPrice: 75000, img: 'https://picsum.photos/id/222/600/400', startPrice: 200, targetPrice: 3200, startTime: '11:00 PM', startDate: '21 فبراير 2026', country: 'SA' },
    { id: 113, name: 'Drone DJI Mini 4', officialPrice: 75000, img: 'https://picsum.photos/id/230/600/400', startPrice: 1200, targetPrice: 4500, startTime: '02:00 PM', startDate: '22 فبراير 2026', country: 'SA' },
    { id: 101, name: 'Sony WH-1000XM5', officialPrice: 75000, img: 'https://picsum.photos/id/200/600/400', startPrice: 1200, targetPrice: 3500, startTime: '04:00 PM', startDate: '12 فبراير 2026', country: 'EG' },
    { id: 105, name: 'Dell XPS 15', officialPrice: 75000, img: 'https://picsum.photos/id/160/600/400', startPrice: 3000, targetPrice: 45000, startTime: '10:00 PM', startDate: '22 فبراير 2026', country: 'EG' },
    { id: 114, name: 'ساعة Garmin Epix', officialPrice: 75000, img: 'https://picsum.photos/id/231/600/400', startPrice: 900, targetPrice: 12000, startTime: '08:00 AM', startDate: '23 فبراير 2026', country: 'EG' },
    { id: 115, name: 'مكواة Philips Steam', officialPrice: 75000, img: 'https://picsum.photos/id/232/600/400', startPrice: 100, targetPrice: 1500, startTime: '03:00 PM', startDate: '24 فبراير 2026', country: 'EG' },
    { id: 103, name: 'Apple Watch Ultra 2', officialPrice: 75000, img: 'https://picsum.photos/id/240/600/400', startPrice: 500, targetPrice: 4200, startTime: '02:30 PM', startDate: '18 فبراير 2026', country: 'AE' },
    { id: 109, name: 'Bose QuietComfort', officialPrice: 75000, img: 'https://picsum.photos/id/241/600/400', startPrice: 150, targetPrice: 1800, startTime: '05:00 PM', startDate: '19 فبراير 2026', country: 'AE' },
    { id: 116, name: 'Samsung Tab S9', officialPrice: 75000, img: 'https://picsum.photos/id/233/600/400', startPrice: 400, targetPrice: 5500, startTime: '09:00 PM', startDate: '20 فبراير 2026', country: 'AE' },
    { id: 117, name: 'Projector Nebula', officialPrice: 75000, img: 'https://picsum.photos/id/234/600/400', startPrice: 300, targetPrice: 2800, startTime: '11:00 AM', startDate: '21 فبراير 2026', country: 'AE' },
    { id: 106, name: 'Dyson V15 Vacuum', officialPrice: 75000, img: 'https://picsum.photos/id/192/600/400', startPrice: 400, targetPrice: 3800, startTime: '11:00 AM', startDate: '25 فبراير 2026', country: 'KW' },
    { id: 110, name: 'Coffee Machine EQ6', officialPrice: 75000, img: 'https://picsum.photos/id/242/600/400', startPrice: 1200, targetPrice: 6000, startTime: '01:00 PM', startDate: '26 فبراير 2026', country: 'KW' },
    { id: 118, name: 'Beats Studio Pro', officialPrice: 75000, img: 'https://picsum.photos/id/235/600/400', startPrice: 100, targetPrice: 1400, startTime: '10:00 PM', startDate: '27 فبراير 2026', country: 'KW' },
    { id: 119, name: 'Xiaomi Scooter 4', officialPrice: 75000, img: 'https://picsum.photos/id/236/600/400', startPrice: 200, targetPrice: 2500, startTime: '12:00 PM', startDate: '28 فبراير 2026', country: 'KW' },
    { id: 107, name: 'LG C3 OLED TV 65"', officialPrice: 75000, img: 'https://picsum.photos/id/103/600/400', startPrice: 2000, targetPrice: 8500, startTime: '08:00 PM', startDate: '28 فبراير 2026', country: 'QA' },
    { id: 111, name: 'Fujifilm X-T5', officialPrice: 75000, img: 'https://picsum.photos/id/243/600/400', startPrice: 900, targetPrice: 11000, startTime: '10:00 AM', startDate: '1 مارس 2026', country: 'QA' },
    { id: 112, name: 'Meta Quest 3', officialPrice: 75000, img: 'https://picsum.photos/id/244/600/400', startPrice: 400, targetPrice: 3000, startTime: '04:00 PM', startDate: '2 مارس 2026', country: 'QA' },
    { id: 120, name: 'Marshall Speaker', officialPrice: 75000, img: 'https://picsum.photos/id/237/600/400', startPrice: 150, targetPrice: 1800, startTime: '06:00 PM', startDate: '3 مارس 2026', country: 'QA' }
  ]);

  finishedAuctions = signal([
    { id: 301, name: 'iPhone 14 Pro', officialPrice: 75000, img: 'https://picsum.photos/id/160/600/400', startPrice: 1000, targetPrice: 5000, finalPrice: 4850, winner: { name: 'أحمد العتيبي', avatar: 'أ' }, country: 'SA' },
    { id: 302, name: 'iPad Pro 2022', officialPrice: 75000, img: 'https://picsum.photos/id/1/600/400', startPrice: 500, targetPrice: 4000, finalPrice: 3900, winner: { name: 'سارة فهد', avatar: 'س' }, country: 'SA' },
    { id: 305, name: 'Samsung A54', officialPrice: 75000, img: 'https://picsum.photos/id/4/600/400', startPrice: 200, targetPrice: 3000, finalPrice: 2950, winner: { name: 'مينا صبحي', avatar: 'م' }, country: 'EG' },
    { id: 309, name: 'DJI Osmo Action 4', officialPrice: 75000, img: 'https://picsum.photos/id/10/600/400', startPrice: 400, targetPrice: 2200, finalPrice: 2100, winner: { name: 'خليفة الشامسي', avatar: 'خ' }, country: 'AE' },
    { id: 313, name: 'Coffee Grinder', officialPrice: 75000, img: 'https://picsum.photos/id/14/600/400', startPrice: 100, targetPrice: 800, finalPrice: 750, winner: { name: 'بدر العنزي', avatar: 'ب' }, country: 'KW' },
    { id: 317, name: 'GoPro Media Mod', officialPrice: 75000, img: 'https://picsum.photos/id/18/600/400', startPrice: 70, targetPrice: 500, finalPrice: 460, winner: { name: 'ناصر الخليفي', avatar: 'ن' }, country: 'QA' }
    // ... تم اختصار البقية للعرض البرمجي فقط مع الحفاظ عليها في ذاكرة الكود لديك
  ]);

  // الفلترة الذكية
  filteredAuctions = computed(() => {
    const code = this.dashboard.selectedCountry().code;
    return this.auctions().filter(a => a.country === code);
  });

  filteredUpcoming = computed(() => {
    const code = this.dashboard.selectedCountry().code;
    return this.upcomingAuctions().filter(a => a.country === code);
  });

  filteredFinished = computed(() => {
    const code = this.dashboard.selectedCountry().code;
    return this.finishedAuctions().filter(a => a.country === code);
  });

constructor() {
  this.startCountdown();
  effect(() => {
    // مراقبة تغيير الدولة من الداشبورد
    this.dashboard.selectedCountry();

    // لو الدولة تغيرت والمودال مفتوح، اقفله فوراً لفك شلل الصفحة
    if (this.isModalOpen()) {
      this.closeModal();
    }
  });
}

  ngAfterViewInit() {
    this.initSwipers();
  }

private initSwipers() {
  const setupSwiperWithButton = (swiperSelector: string, buttonId: string) => {
    const btn = document.getElementById(buttonId);
    if (btn && window.innerWidth < 1024) {
      gsap.set(btn, { autoAlpha: 0, scale: 0.5, display: "none" });
    }

    return new Swiper(swiperSelector, {
      // إذا كان هذا السوايب هو الـ stats، اجعله يظهر جزء من الكروت التالية، وإلا slide واحد
      slidesPerView: swiperSelector === '.stats-swiper-mobile' ? 'auto' : 1,
      spaceBetween: 20,
      centeredSlides: swiperSelector === '.stats-swiper-mobile' ? false : true,
      enabled: true,
      on: {
        slideChange: (swiper: any) => {
          if (window.innerWidth < 1024 && btn) {
            if (swiper.isEnd) {
              gsap.to(btn, {
                display: "flex", autoAlpha: 1, scale: 1, duration: 0.15,
                ease: "back.out(1.5)", overwrite: true
              });
            } else {
              gsap.to(btn, { autoAlpha: 0, scale: 0.5, duration: 0.1, ease: "power2.in", overwrite: true });
            }
          }
        }
      },
      breakpoints: { 1024: { enabled: false } }
    });
  };

  // السوايبس القديمة بتاعتك
  setupSwiperWithButton('.auctions-swiper', 'moreBtnActive');
  setupSwiperWithButton('.upcoming-swiper', 'moreBtnUpcoming');

  // إضافة السوايب الجديد للإحصائيات (بدون زرار "المزيد" حالياً، بعت كلاس وهمي)
  setupSwiperWithButton('.stats-swiper-mobile', 'noBtn');
}

  private startCountdown() {
    this.timerInterval = setInterval(() => {
      this.auctions.update(list =>
        list.map(auction => ({
          ...auction,
          timeLeft: auction.timeLeft > 0 ? auction.timeLeft - 1 : 0
        }))
      );
    }, 1000);
  }

  private getCountryFromStorage() {
    const data = localStorage.getItem('selected_country');
    return data ? JSON.parse(data) : { name: 'مصر', code: 'EG', currency: 'ج.م' };
  }

  getTimeParts(totalSeconds: number) {
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      d: days,
      h: days > 0 ? (days < 10 ? '0' + days : days) : (hours < 10 ? '0' + hours : hours),
      m: minutes < 10 ? '0' + minutes : minutes,
      s: seconds < 10 ? '0' + seconds : seconds
    };
  }

  toggleAi() { alert('سيتم إيقاف البوت لهذا المنتج'); }


openEditModal(auction: any, event: Event) {
  event.preventDefault();
  event.stopPropagation();

  this.selectedAuction = JSON.parse(JSON.stringify(auction));
  this.imagePreview = null;

  // إجبار الـ Body على عدم الحركة
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // تفعيل المودال
  this.isModalOpen.set(true);

  console.log("تم تفعيل المودال، القيمة الحالية:", this.isModalOpen());
}

closeModal() {
  this.isModalOpen.set(false);
  this.selectedAuction = null;
  // إعادة السكرول فوراً
  document.body.style.overflow = 'auto';
  document.body.classList.remove('modal-open');
}

saveChanges() {

  if (!this.selectedAuction) return;

  this.upcomingAuctions.update(list => {
    const index = list.findIndex(a => a.id === this.selectedAuction.id);
    if (index > -1) {
      list[index] = {
        ...this.selectedAuction,
        img: this.imagePreview ? this.imagePreview : this.selectedAuction.img
      };
    }
    return [...list];
  });

  this.closeModal(); // استخدام الدالة الموحدة للإغلاق والمسح
  alert('تم تحديث بيانات المزاد بنجاح!');
}
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  removeImage() { this.imagePreview = null; }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}
