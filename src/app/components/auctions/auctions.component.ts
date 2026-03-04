
// import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
// import { ApiService } from '../../Services/api.service';

// @Component({
//   selector: 'app-auctions',
//   templateUrl: './auctions.component.html',
//   styleUrls: ['./auctions.component.scss']
// })
// export class AuctionsComponent implements OnInit, OnDestroy {
//   activeAuctions: any[] = [];
//   allProducts: any[] = [];
//   itemsToShow: number = 4; // حل مشكلة الخطأ في الصورة
//   selectedCountry: any;
//   searchTerm: string = '';
//   showDropdown: boolean = false;
//   showAddModal = false;
//   isEditMode = false;
//   timerInterval: any;
//   storageCheckInterval: any;

//   newAuctionObj: any = {
//     id: null,
//     name: '',
//     productId: null,
//     startPoints: 0,
//     targetPoints: 0,
//     startTime: '',
//     endTime: '',
//     img: ''
//   };

//   constructor(private apiService: ApiService, private el: ElementRef) {}

//   ngOnInit(): void {
//     this.refreshCountryAndData();
//     this.loadAllProducts();
//     this.setupStorageWatcher();
//     this.startCountdown();
//   }

//   // دالة تحويل التاريخ لتنسيق datetime-local (مهمة جداً لظهور الوقت عند التعديل)
//   private formatDateTimeLocal(dateStr: string | undefined): string {
//     if (!dateStr) return '';
//     const date = new Date(dateStr);
//     const tzOffset = date.getTimezoneOffset() * 60000;
//     return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
//   }

//   // إغلاق القائمة عند النقر في الخارج
//   @HostListener('document:click', ['$event'])
//   onClick(event: Event) {
//     if (!this.el.nativeElement.contains(event.target)) {
//       this.showDropdown = false;
//     }
//   }

//   // --- منطق البحث واختيار المنتج ---
//   filteredProducts() {
//     return this.searchTerm
//       ? this.allProducts.filter(p => p.name.toLowerCase().includes(this.searchTerm.toLowerCase()))
//       : this.allProducts;
//   }

//   selectProduct(prod: any) {
//     this.newAuctionObj.productId = prod.id;
//     this.newAuctionObj.name = prod.name;
//     this.newAuctionObj.img = prod.imageUrl;
//     this.searchTerm = prod.name;
//     this.showDropdown = false;
//   }

//   // --- فتح المودال (إضافة أو تعديل) ---
//   openAddModal() {
//     this.isEditMode = false;
//     this.resetForm();
//     this.showAddModal = true;
//   }

// openEditModal(auction: any) {
//   this.isEditMode = true;
//   this.showAddModal = true;

//   this.newAuctionObj = {
//     id: auction.id,
//     name: auction.name,
//     // التأكد من جلب الـ ID الصحيح للمنتج
//     productId: auction.product?.id || auction.productId,
//     startPoints: auction.startPrice || auction.startPoints || 0,
//     targetPoints: auction.targetPrice || auction.limited || 0,
//     startTime: this.formatDateTimeLocal(auction.startTime),
//     endTime: this.formatDateTimeLocal(auction.endTime),
//     img: auction.img
//   };

//   this.searchTerm = auction.name;
// }
//   // --- الإرسال الفعلي (POST أو PUT) ---
// submitNewAuction() {
//   const payload = {
//     roomName: this.newAuctionObj.name,
//     productId: Number(this.newAuctionObj.productId),
//     startPoints: Number(this.newAuctionObj.startPoints),
//     startTime: new Date(this.newAuctionObj.startTime).toISOString(),
//     endTime: new Date(this.newAuctionObj.endTime).toISOString(),
//     limited: Number(this.newAuctionObj.targetPoints),
//     countryId: Number(this.selectedCountry.id)
//   };

//   if (this.isEditMode) {
//     // التغيير هنا: استخدم updateAuctionRoom وليس updateProduct
//     this.apiService.updateAuctionRoom(this.newAuctionObj.id, payload).subscribe({
//       next: () => {
//         this.handleSuccess('تم التعديل بنجاح');
//       },
//       error: (err) => {
//         console.error(err);
//         alert('حدث خطأ أثناء التعديل');
//       }
//     });
//   } else {
//     this.apiService.postAuction(payload).subscribe({
//       next: () => this.handleSuccess('تمت الإضافة بنجاح'),
//       error: (err) => console.error(err)
//     });
//   }
// }

//   private handleSuccess(msg: string) {
//     alert(msg);
//     this.loadActiveAuctions();
//     this.closeModal();
//   }

//   // --- جلب البيانات والتايمر ---
// loadActiveAuctions() {
//   this.apiService.getActiveAuctionRooms(this.selectedCountry.id, 0).subscribe((res: any) => {
//     this.activeAuctions = (res || []).map((item: any) => ({
//       ...item,
//       // البيانات الأساسية من السيرفر
//       officialPrice: item.product?.price || 0,
//       currency: item.product?.currency || 'KWD',
//       img: item.product?.imageUrl || 'assets/placeholder.png',
//       startPrice: item.startPoints || 0,
//       targetPrice: item.limited || 0, // السيرفر يرسلها باسم limited
//       totalPoints: item.currentHighestBid || item.startPoints || 0,

//       // منطق الوقت والمزايد
//       timeLeft: this.calculateSeconds(item.endTime),
//       lastBidder: {
//         name: item.highestBidderName || 'لا يوجد مزايد'
//       }
//     }));
//   });
// }

// loadAllProducts() {
//   this.apiService.getProducts().subscribe(res => {
//     // تأكد أن res هي المصفوفة، إذا كانت داخل كائن (مثلاً res.data) قم بتغييرها
//     this.allProducts = Array.isArray(res) ? res : (res.data || []);
//     console.log('Products Loaded:', this.allProducts); // للتأكد في الكونسول
//   });
// }

//   closeModal() { this.showAddModal = false; this.resetForm(); }

//   resetForm() {
//     this.newAuctionObj = { id: null, name: '', productId: null, startPoints: 0, targetPoints: 0, startTime: '', endTime: '', img: '' };
//     this.searchTerm = '';
//   }

// refreshCountryAndData() {
//   const data = localStorage.getItem('selected_country');
//   const newCountry = data ? JSON.parse(data) : { id: 3, name: 'مصر' };

//   // طلب البيانات فقط إذا تغير رقم الدولة عن القيمة الموجودة حالياً
//   if (!this.selectedCountry || this.selectedCountry.id !== newCountry.id) {
//     this.selectedCountry = newCountry;
//     this.loadActiveAuctions(); // طلب البيانات فوراً عند التغيير
//     console.log('Country changed, loading data for:', this.selectedCountry.name);
//   }
// }

//   private calculateSeconds(endTime: string): number {
//     const diff = new Date(endTime).getTime() - new Date().getTime();
//     return diff > 0 ? Math.floor(diff / 1000) : 0;
//   }

//   getTimeParts(s: number) {
//     if (s <= 0) return { d: 0, h: '00', m: '00', s: '00' };
//     return {
//       d: Math.floor(s / 86400),
//       h: Math.floor((s % 86400) / 3600).toString().padStart(2, '0'),
//       m: Math.floor((s % 3600) / 60).toString().padStart(2, '0'),
//       s: (s % 60).toString().padStart(2, '0')
//     };
//   }

//   startCountdown() {
//     this.timerInterval = setInterval(() => {
//       this.activeAuctions.forEach(item => { if (item.timeLeft > 0) item.timeLeft--; });
//     }, 1000);
//   }

//   setupStorageWatcher() {
//     this.storageCheckInterval = setInterval(() => this.refreshCountryAndData(), 1000);
//   }

//   ngOnDestroy() {
//     clearInterval(this.timerInterval);
//     clearInterval(this.storageCheckInterval);
//   }
// }



// import { ApiService } from '../../Services/api.service';
// import { AfterViewInit, Component, inject, OnDestroy, ChangeDetectorRef, OnInit } from '@angular/core';
// import Swiper from 'swiper';
// import { DashboardComponent } from '../dashboard/dashboard.component';


// @Component({
//   selector: 'app-auctions',
//   templateUrl: './auctions.component.html',
//   styleUrls: ['./auctions.component.scss']
// })

// export class AuctionsComponent implements OnInit, OnDestroy {
//   public dashboard = inject(DashboardComponent);
//   private apiService = inject(ApiService);
//   private cdr = inject(ChangeDetectorRef);

//   // مصفوفات البيانات
//   allAuctions: any[] = [];
//   activeAuctions: any[] = [];
//   upcomingAuctions: any[] = [];
//   finishedAuctions: any[] = [];
//   allProducts: any[] = [];
//   // حالات المودال والتحميل
//   isEditMode = false;
//   searchTerm = '';
//   showDropdown = false;

//   selectedAuction: any = null;
//   isModalOpen = false;
//   isLoading = true;
//   private timerInterval: any;


//   ngOnInit() {
//     this.loadData();
//     this.startCountdown();

//     // مراقبة تغيير الدولة من الـ Dashboard لتحديث البيانات فوراً
//     // ملاحظة: بما أن Dashboard يستخدم Signals، هذا الـ setInterval يضمن تحديث الواجهة عند التغيير
//     setInterval(() => {
//       this.filterAuctionsByCountry();
//     }, 1000);

//     // داخل ngOnInit
//     //   effect(() => {
//     //   // هذا الكود سيعمل فقط عندما تتغير selectedCountry تلقائياً
//     //   this.dashboard.selectedCountry();
//     //   this.filterAuctionsByCountry();
//     // }, { allowSignalWrites: true });

//   }

//   loadData() {
//     this.isLoading = true;
//     this.apiService.getAuctionRooms().subscribe({
//       next: (data: any) => {
//         // الـ API يرجع المصفوفة مباشرة أو داخل property حسب تصميم الباك-إند
//         this.allAuctions = Array.isArray(data) ? data : (data.data || []);
//         this.filterAuctionsByCountry();
//         this.isLoading = false;
//       },
//       error: (err) => {
//         console.error('Error fetching auctions:', err);
//         this.isLoading = false;
//       }
//     });
//   }

// // ... داخل الكلاس HomeComponent

// filterAuctionsByCountry() {
//   const currentCountry = this.dashboard.selectedCountry();
//   const countryId = currentCountry.id;

//   // 1. المزادات النشطة (Status = 1)
//   this.activeAuctions = this.allAuctions
//     .filter(a => a.countryId === countryId && a.status === 1)
//     .map(a => this.mapToUI(a));

//   // 2. المزادات القادمة (Status = 0)
//   this.upcomingAuctions = this.allAuctions
//     .filter(a => a.countryId === countryId && a.status === 0)
//     .map(a => this.mapToUI(a));

//   // 3. المزادات المنتهية (Status = 2)
//   this.finishedAuctions = this.allAuctions
//     .filter(a => a.countryId === countryId && a.status === 2)
//     .map(item => ({
//       ...this.mapToUI(item),
//       winner: item.winner ? {
//         name: item.winner.userName || 'مستخدم غير معروف',
//         avatar: item.winner.userName ? item.winner.userName[0] : 'W',
//         winningPoints: item.winner.winningPoints
//       } : null
//     }));

//   this.cdr.detectChanges();
// }

// private mapToUI(item: any) {
//   return {
//     id: item.id,
//     name: item.name,
//     officialPrice: item.product?.price || 0,
//     img: item.product?.imageUrl || 'assets/images/placeholder.png',
//     startPrice: item.startPoints || 0,
//     targetPrice: item.limited || 0,
//     currentBid: item.currentHighestBid || 0,
//     totalPoints: item.currentHighestBid || item.startPoints,
//     timeLeft: this.calculateSeconds(item.endTime),
//     startTime: item.startTime,
//     endTime: item.endTime,
//     status: item.status,// مهم للمزادات القادمة
//     currency: item.product?.currency || this.dashboard.selectedCountry().currency || 'ج.م',
//     lastBidder: {
//       name: item.highestBidderName || 'لا يوجد مزايد',
//       avatar: item.highestBidderName ? item.highestBidderName[0] : '?'
//     }
//   };
// }

//   private calculateSeconds(endTime: string): number {
//     if (!endTime) return 0;
//     const diff = Math.floor((new Date(endTime).getTime() - new Date().getTime()) / 1000);
//     return diff > 0 ? diff : 0;
//   }

//   private startCountdown() {
//     this.timerInterval = setInterval(() => {
//       this.activeAuctions.forEach(a => {
//         if (a.timeLeft > 0) a.timeLeft--;
//       });
//     }, 1000);
//   }

// getTimeParts(totalSeconds: number) {
//   const days = Math.floor(totalSeconds / (3600 * 24));
//   const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
//   const minutes = Math.floor((totalSeconds % 3600) / 60);
//   const seconds = totalSeconds % 60;

//   return {
//     d: days,
//     h: hours < 10 ? '0' + hours : hours,
//     m: minutes < 10 ? '0' + minutes : minutes,
//     s: seconds < 10 ? '0' + seconds : seconds
//   };
// }
//   ngAfterViewInit() {
//     setTimeout(() => this.initSwipers(), 500);
//   }

//   private initSwipers() {
//     const swiperConfig = {
//       slidesPerView: 'auto' as const,
//       spaceBetween: 15,
//       observer: true,
//       observeParents: true,
//     };
//     new Swiper('.auctions-swiper', swiperConfig);
//     new Swiper('.upcoming-swiper', swiperConfig);
//     new Swiper('.finished-swiper', swiperConfig);
//     new Swiper('.stats-swiper-mobile', swiperConfig);
//   }

//   // دوال المودال والتحكم
// openEditModal(auction: any, event: Event) {
//   event.stopPropagation();
//   this.isEditMode = true;

//   // نأخذ نسخة عميقة حتى لا يتغير السطر في الجدول إلا بعد الضغط على "حفظ"
//   this.selectedAuction = {
//     ...auction,
//     // تحويل التواريخ لتناسب format المدخل datetime-local
//     startTime: auction.startTime ? new Date(auction.startTime).toISOString().slice(0, 16) : '',
//     endTime: auction.endTime ? new Date(auction.endTime).toISOString().slice(0, 16) : '',
//     targetPoints: auction.targetPrice, // تأكد من مطابقة المسميات مع الـ HTML
//     startPoints: auction.startPrice
//   };

//   this.isModalOpen = true;
//   document.body.style.overflow = 'hidden';
// }

// // دالة الحفظ الفعلي
// submitUpdate() {
//   if (!this.selectedAuction.id) return;

//   this.isLoading = true;
//   // نجهز البيانات المرسلة للـ API
//   const payload = {
//     id: this.selectedAuction.id,
//     name: this.selectedAuction.name,
//     startTime: this.selectedAuction.startTime,
//     endTime: this.selectedAuction.endTime,
//     startPoints: this.selectedAuction.startPoints,
//     limited: this.selectedAuction.targetPoints,
//     // أضف أي حقول أخرى يطلبها الـ API الخاص بك
//   };

//   this.apiService.updateAuctionRoom(this.selectedAuction.id, payload).subscribe({
//     next: (res) => {
//       // 1. تحديث البيانات في المصفوفة المحلية فوراً دون إعادة تحميل الصفحة كاملة
//       this.loadData();
//       this.closeModal();
//       // يمكنك إضافة Toast Message هنا "تم التحديث بنجاح"
//     },
//     error: (err) => {
//       console.error('Update failed', err);
//       alert('حدث خطأ أثناء التحديث');
//     },
//     complete: () => this.isLoading = false
//   });
// }

// // معالجة تغيير الصورة
// onFileSelected(event: any) {
//   const file = event.target.files[0];
//   if (file) {
//     const reader = new FileReader();
//     reader.onload = () => {
//       this.selectedAuction.img = reader.result as string;
//       // هنا يمكنك رفع الصورة للـ سيرفر فوراً أو إرسالها مع الـ Form
//     };
//     reader.readAsDataURL(file);
//   }
// }


//   closeModal() {
//     this.isModalOpen = false;
//     this.selectedAuction = null;
//     document.body.style.overflow = 'auto';
//   }

//   ngOnDestroy() {
//     if (this.timerInterval) clearInterval(this.timerInterval);
//   }
// }




import { Component, OnInit, OnDestroy, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { ApiService } from '../../Services/api.service';
import Swiper from 'swiper';

@Component({
  selector: 'app-auctions',
  templateUrl: './auctions.component.html',
  styleUrls: ['./auctions.component.scss']
})
export class AuctionsComponent implements OnInit, OnDestroy, AfterViewInit {
  public dashboard = inject(DashboardComponent);
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  allAuctions: any[] = [];
  activeAuctionsList: any[] = [];
  upcomingAuctionsList: any[] = [];
  finishedAuctionsList: any[] = [];

  selectedAuction: any = null;
  isModalOpen = false;
  isLoading = false;
  private timerInterval: any;

  ngOnInit() {
    this.loadData();
    this.startCountdown();

    // مراقبة تغيير الدولة لتحديث البيانات دون تجميد الصفحة
    // نستخدم التحديث اليدوي فقط عند الحاجة
    this.timerInterval = setInterval(() => {
       this.refreshFiltering();
    }, 1000);
  }

  loadData() {
    this.isLoading = true;
    this.apiService.getAuctionRooms().subscribe({
      next: (data: any) => {
        this.allAuctions = Array.isArray(data) ? data : (data.data || []);
        this.refreshFiltering();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching auctions:', err);
        this.isLoading = false;
      }
    });
  }

  // دالة واحدة لفلترة البيانات بدلاً من الـ Getters المتكررة
  refreshFiltering() {
    const country = this.dashboard.selectedCountry();

      if (!country || !country.name || !this.allAuctions || this.allAuctions.length === 0) {
        return;
      }

    const countryId = country.id;

    this.activeAuctionsList = this.allAuctions
      .filter(a => a.countryId === countryId && a.status === 1)
      .map(a => this.mapToUI(a));

    this.upcomingAuctionsList = this.allAuctions
      .filter(a => a.countryId === countryId && a.status === 0)
      .map(a => this.mapToUI(a));

    this.finishedAuctionsList = this.allAuctions
      .filter(a => a.countryId === countryId && a.status === 2)
      .map(item => ({
        ...this.mapToUI(item),
        winner: item.winner ? {
          name: item.winner.userName || 'مستخدم غير معروف',
          avatar: item.winner.userName ? item.winner.userName[0] : 'W',
          winningPoints: item.winner.winningPoints
        } : null
      }));

    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.selectedAuction) {
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedAuction.img = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  submitUpdate() {
    if (!this.selectedAuction || !this.selectedAuction.id) return;
    this.isLoading = true;

    const payload = {
      id: this.selectedAuction.id,
      roomName: this.selectedAuction.name,
      productId: this.selectedAuction.productId || this.selectedAuction.product?.id,
      startPoints: Number(this.selectedAuction.startPoints),
      startTime: new Date(this.selectedAuction.startTime).toISOString(),
      endTime: new Date(this.selectedAuction.endTime).toISOString(),
      limited: Number(this.selectedAuction.targetPoints),
      countryId: this.selectedAuction.countryId
    };

    this.apiService.updateAuctionRoom(this.selectedAuction.id, payload).subscribe({
      next: (res) => {
        const index = this.allAuctions.findIndex(a => a.id === payload.id);
        if (index !== -1) {
          this.allAuctions[index] = { ...this.allAuctions[index], ...payload, name: payload.roomName };
          this.refreshFiltering();
        }
        this.closeModal();
        alert('تم حفظ التعديلات بنجاح');
      },
      error: (err) => {
        alert(err.error?.message || 'خطأ في التحديث (400)');
      },
      complete: () => this.isLoading = false
    });
  }

  private mapToUI(item: any) {
    return {
      ...item,
      name: item.name || item.roomName,
      officialPrice: item.product?.price || 0,
      img: item.product?.imageUrl || 'assets/images/placeholder.png',
      startPrice: item.startPoints || 0,
      targetPrice: item.limited || 0,
      currentBid: item.currentHighestBid || 0,
      totalPoints: item.currentHighestBid || item.startPoints,
      timeLeft: this.calculateSeconds(item.endTime),
      currency: item.product?.currency || this.dashboard.selectedCountry()?.currency || 'ج.م',
      lastBidder: {
        name: item.highestBidderName || 'لا يوجد مزايد',
        avatar: item.highestBidderName ? item.highestBidderName[0] : '?'
      }
    };
  }

  openEditModal(auction: any, event: Event) {
    event.stopPropagation();
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleString('sv-SE', { hour12: false }).replace(' ', 'T').substring(0, 16);
    };

    this.selectedAuction = {
      ...auction,
      startTime: formatDate(auction.startTime),
      endTime: formatDate(auction.endTime),
      targetPoints: auction.targetPrice,
      startPoints: auction.startPrice
    };
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedAuction = null;
    document.body.style.overflow = 'auto';
  }

  private calculateSeconds(endTime: string): number {
    if (!endTime) return 0;
    const diff = Math.floor((new Date(endTime).getTime() - new Date().getTime()) / 1000);
    return diff > 0 ? diff : 0;
  }

  private startCountdown() {
    // تم دمج التحديث داخل setInterval الموجود في ngOnInit
  }

  getTimeParts(totalSeconds: number) {
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { d, h: h < 10 ? '0'+h : h, m: m < 10 ? '0'+m : m, s: s < 10 ? '0'+s : s };
  }

  ngAfterViewInit() { setTimeout(() => this.initSwipers(), 500); }
  private initSwipers() {
    const config = { slidesPerView: 'auto' as const, spaceBetween: 15, observer: true, observeParents: true };
    new Swiper('.auctions-swiper', config);
    new Swiper('.upcoming-swiper', config);
    new Swiper('.finished-swiper', config);
    new Swiper('.stats-swiper-mobile', config);
  }

  ngOnDestroy() { if (this.timerInterval) clearInterval(this.timerInterval); }
}




// export class AuctionsComponent implements OnInit, OnDestroy, AfterViewInit {
//   public dashboard = inject(DashboardComponent);
//   private apiService = inject(ApiService);
//   private cdr = inject(ChangeDetectorRef);

//   allAuctions: any[] = [];
//   selectedAuction: any = null;
//   isModalOpen = false;
//   isLoading = false;
//   private timerInterval: any;

//   // --- القوائم الذكية (Getters) للتحديث الفوري ---
//   get currentCountry() {
//     return this.dashboard.selectedCountry();
//   }

//   get activeAuctionsList() {
//     if (!this.currentCountry) return [];
//     return this.allAuctions
//       .filter(a => a.countryId === this.currentCountry.id && a.status === 1)
//       .map(a => this.mapToUI(a));
//   }

//   get upcomingAuctionsList() {
//     if (!this.currentCountry) return [];
//     return this.allAuctions
//       .filter(a => a.countryId === this.currentCountry.id && a.status === 0)
//       .map(a => this.mapToUI(a));
//   }

//   get finishedAuctionsList() {
//     if (!this.currentCountry) return [];
//     return this.allAuctions
//       .filter(a => a.countryId === this.currentCountry.id && a.status === 2)
//       .map(item => ({
//         ...this.mapToUI(item),
//         winner: item.winner ? {
//           name: item.winner.userName || 'مستخدم غير معروف',
//           avatar: item.winner.userName ? item.winner.userName[0] : 'W',
//           winningPoints: item.winner.winningPoints
//         } : null
//       }));
//   }

//   ngOnInit() {
//     this.loadData();
//     this.startCountdown();
//   }

//   loadData() {
//     this.isLoading = true;
//     this.apiService.getAuctionRooms().subscribe({
//       next: (data: any) => {
//         this.allAuctions = Array.isArray(data) ? data : (data.data || []);
//         this.isLoading = false;
//         this.cdr.detectChanges();
//       },
//       error: (err) => {
//         console.error('Error fetching auctions:', err);
//         this.isLoading = false;
//       }
//     });
//   }

//   // --- دالة اختيار الملف (التي تسببت في الخطأ) ---
//   onFileSelected(event: any) {
//     const file = event.target.files[0];
//     if (file && this.selectedAuction) {
//       const reader = new FileReader();
//       reader.onload = () => {
//         this.selectedAuction.img = reader.result as string;
//       };
//       reader.readAsDataURL(file);
//     }
//   }

//   submitUpdate() {
//     if (!this.selectedAuction || !this.selectedAuction.id) return;
//     this.isLoading = true;

//     // تجهيز البيانات طبقاً لصورة الـ Postman المرفقة
//     const payload = {
//       id: this.selectedAuction.id,
//       roomName: this.selectedAuction.name,
//       productId: this.selectedAuction.productId,
//       startPoints: this.selectedAuction.startPoints,
//       startTime: new Date(this.selectedAuction.startTime).toISOString(),
//       endTime: new Date(this.selectedAuction.endTime).toISOString(),
//       limited: this.selectedAuction.targetPoints,
//       countryId: this.selectedAuction.countryId
//     };

//     this.apiService.updateAuctionRoom(this.selectedAuction.id, payload).subscribe({
//       next: (res) => {
//         const index = this.allAuctions.findIndex(a => a.id === payload.id);
//         if (index !== -1) {
//           this.allAuctions[index] = {
//             ...this.allAuctions[index],
//             ...payload,
//             name: payload.roomName
//           };
//         }
//         this.closeModal();
//       },
//       error: (err) => {
//         console.error('Update error:', err);
//         alert('حدث خطأ أثناء حفظ البيانات');
//       },
//       complete: () => this.isLoading = false
//     });
//   }

//   private mapToUI(item: any) {
//     return {
//       ...item,
//       id: item.id,
//       name: item.name || item.roomName,
//       officialPrice: item.product?.price || 0,
//       img: item.product?.imageUrl || 'assets/images/placeholder.png',
//       startPrice: item.startPoints || 0,
//       targetPrice: item.limited || 0,
//       currentBid: item.currentHighestBid || 0,
//       totalPoints: item.currentHighestBid || item.startPoints,
//       timeLeft: this.calculateSeconds(item.endTime),
//       currency: item.product?.currency || this.currentCountry?.currency || 'ج.م',
//       lastBidder: {
//         name: item.highestBidderName || 'لا يوجد مزايد',
//         avatar: item.highestBidderName ? item.highestBidderName[0] : '?'
//       }
//     };
//   }

//   // --- بقية الدوال المساعدة ---
//   private calculateSeconds(endTime: string): number {
//     if (!endTime) return 0;
//     const diff = Math.floor((new Date(endTime).getTime() - new Date().getTime()) / 1000);
//     return diff > 0 ? diff : 0;
//   }

//   getTimeParts(totalSeconds: number) {
//     const days = Math.floor(totalSeconds / (3600 * 24));
//     const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
//     return { d: days, h: hours < 10 ? '0' + hours : hours, m: minutes < 10 ? '0' + minutes : minutes, s: seconds < 10 ? '0' + seconds : seconds };
//   }

//   openEditModal(auction: any, event: Event) {
//     event.stopPropagation();
//     const formatDate = (dateStr: string) => {
//       if (!dateStr) return '';
//       const d = new Date(dateStr);
//       return d.toLocaleString('sv-SE', { hour12: false }).replace(' ', 'T').substring(0, 16);
//     };

//     this.selectedAuction = {
//       ...auction,
//       startTime: formatDate(auction.startTime),
//       endTime: formatDate(auction.endTime),
//       targetPoints: auction.targetPrice,
//       startPoints: auction.startPrice
//     };
//     this.isModalOpen = true;
//     document.body.style.overflow = 'hidden';
//   }

//   closeModal() {
//     this.isModalOpen = false;
//     this.selectedAuction = null;
//     document.body.style.overflow = 'auto';
//   }

//   private startCountdown() {
//     this.timerInterval = setInterval(() => { this.cdr.detectChanges(); }, 1000);
//   }

//   ngAfterViewInit() { setTimeout(() => this.initSwipers(), 500); }
//   private initSwipers() {
//     const config = { slidesPerView: 'auto' as const, spaceBetween: 15, observer: true, observeParents: true };
//     new Swiper('.auctions-swiper', config);
//     new Swiper('.upcoming-swiper', config);
//     new Swiper('.finished-swiper', config);
//     new Swiper('.stats-swiper-mobile', config);
//   }

//   ngOnDestroy() { if (this.timerInterval) clearInterval(this.timerInterval); }
// }
