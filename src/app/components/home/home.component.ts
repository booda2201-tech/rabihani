


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




import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { ApiService } from '../../Services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  activeAuctions: any[] = [];
  allProducts: any[] = [];
  itemsToShow: number = 4; // حل مشكلة الخطأ في الصورة
  selectedCountry: any;
  searchTerm: string = '';
  showDropdown: boolean = false;
  showAddModal = false;
  isEditMode = false;
  timerInterval: any;
  storageCheckInterval: any;
  selectedFile: File | null = null;

  newAuctionObj: any = {
    id: null,
    name: '',
    productId: null,
    startPoints: 0,
    targetPoints: 0,
    startTime: '',
    endTime: '',
    img: ''
  };

  constructor(private apiService: ApiService, private el: ElementRef) {}

  ngOnInit(): void {
    this.refreshCountryAndData();
    this.loadAllProducts();
    this.setupStorageWatcher();
    this.startCountdown();
  }

  // دالة تحويل التاريخ لتنسيق datetime-local (مهمة جداً لظهور الوقت عند التعديل)
  private formatDateTimeLocal(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  // إغلاق القائمة عند النقر في الخارج
  @HostListener('document:click', ['$event'])
  onClick(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showDropdown = false;
    }
  }

  // --- منطق البحث واختيار المنتج ---
  filteredProducts() {
    return this.searchTerm
      ? this.allProducts.filter(p => p.name.toLowerCase().includes(this.searchTerm.toLowerCase()))
      : this.allProducts;
  }

  selectProduct(prod: any) {
    this.newAuctionObj.productId = prod.id;
    this.newAuctionObj.name = prod.name;
    this.newAuctionObj.img = prod.imageUrl;
    this.searchTerm = prod.name;
    this.showDropdown = false;
  }

  // --- فتح المودال (إضافة أو تعديل) ---
  openAddModal() {
    this.isEditMode = false;
    this.resetForm();
    this.showAddModal = true;
  }

openEditModal(auction: any) {
  this.isEditMode = true;
  this.showAddModal = true;

  this.newAuctionObj = {
    id: auction.id,
    name: auction.name,
    // التأكد من جلب الـ ID الصحيح للمنتج
    productId: auction.product?.id || auction.productId,
    startPoints: auction.startPrice || auction.startPoints || 0,
    targetPoints: auction.targetPrice || auction.limited || 0,
    startTime: this.formatDateTimeLocal(auction.startTime),
    endTime: this.formatDateTimeLocal(auction.endTime),
    img: auction.img
  };

  this.searchTerm = auction.name;
}

submitNewAuction() {
  // 1. تحضير البيانات في كائن JSON عادي أولاً (لتطابق الـ Postman)
  const auctionData = {
    roomName: this.newAuctionObj.name,
    productId: Number(this.newAuctionObj.productId),
    startPoints: Number(this.newAuctionObj.startPoints),
    startTime: new Date(this.newAuctionObj.startTime).toISOString(),
    endTime: new Date(this.newAuctionObj.endTime).toISOString(),
    limited: Number(this.newAuctionObj.targetPoints),
    countryId: Number(this.selectedCountry.id)
  };

  let requestData: any;


  if (this.selectedFile) {
    const formData = new FormData();

    Object.keys(auctionData).forEach(key => {
      formData.append(key, (auctionData as any)[key]);
    });
    formData.append('image', this.selectedFile);
    if (this.isEditMode) formData.append('id', this.newAuctionObj.id);

    requestData = formData;
  } else {

    requestData = auctionData;
    if (this.isEditMode) (requestData as any).id = this.newAuctionObj.id;
  }

  // إرسال الطلب
  if (this.isEditMode) {
    this.apiService.updateAuctionRoom(this.newAuctionObj.id, requestData).subscribe({
      next: () => this.handleSuccess('تم التعديل بنجاح'),
      error: (err) => {
        console.error("Error details:", err);
        alert('فشل التعديل: ' + (err.error?.message || 'تأكد من إعدادات السيرفر'));
      }
    });
  } else {
    this.apiService.postAuction(requestData).subscribe({
      next: () => this.handleSuccess('تمت الإضافة بنجاح'),
      error: (err) => console.error(err)
    });
  }
}

  private handleSuccess(msg: string) {
    alert(msg);
    this.loadActiveAuctions();
    this.closeModal();
  }

  // --- جلب البيانات والتايمر ---
loadActiveAuctions() {
  this.apiService.getActiveAuctionRooms(this.selectedCountry.id, 0).subscribe((res: any) => {
    this.activeAuctions = (res || []).map((item: any) => ({
      ...item,
      // البيانات الأساسية من السيرفر
      officialPrice: item.product?.price || 0,
      currency: item.product?.currency || 'KWD',
      img: item.product?.imageUrl || 'assets/placeholder.png',
      startPrice: item.startPoints || 0,
      targetPrice: item.limited || 0, // السيرفر يرسلها باسم limited
      totalPoints: item.currentHighestBid || item.startPoints || 0,

      // منطق الوقت والمزايد
      timeLeft: this.calculateSeconds(item.endTime),
      lastBidder: {
        name: item.highestBidderName || 'لا يوجد مزايد'
      }
    }));
  });
}

loadAllProducts() {
  this.apiService.getProducts().subscribe(res => {
    // تأكد أن res هي المصفوفة، إذا كانت داخل كائن (مثلاً res.data) قم بتغييرها
    this.allProducts = Array.isArray(res) ? res : (res.data || []);
    console.log('Products Loaded:', this.allProducts); // للتأكد في الكونسول
  });
}

  closeModal() { this.showAddModal = false; this.resetForm(); }

resetForm() {
  this.newAuctionObj = { id: null, name: '', productId: null, startPoints: 0, targetPoints: 0, startTime: '', endTime: '', img: '' };
  this.searchTerm = '';
  this.selectedFile = null; // مهم جداً
}

refreshCountryAndData() {
  const data = localStorage.getItem('selected_country');
  const newCountry = data ? JSON.parse(data) : { id: 3, name: 'مصر' };

  // طلب البيانات فقط إذا تغير رقم الدولة عن القيمة الموجودة حالياً
  if (!this.selectedCountry || this.selectedCountry.id !== newCountry.id) {
    this.selectedCountry = newCountry;
    this.loadActiveAuctions(); // طلب البيانات فوراً عند التغيير
    console.log('Country changed, loading data for:', this.selectedCountry.name);
  }
}

  private calculateSeconds(endTime: string): number {
    const diff = new Date(endTime).getTime() - new Date().getTime();
    return diff > 0 ? Math.floor(diff / 1000) : 0;
  }

  getTimeParts(s: number) {
    if (s <= 0) return { d: 0, h: '00', m: '00', s: '00' };
    return {
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600).toString().padStart(2, '0'),
      m: Math.floor((s % 3600) / 60).toString().padStart(2, '0'),
      s: (s % 60).toString().padStart(2, '0')
    };
  }

  startCountdown() {
    this.timerInterval = setInterval(() => {
      this.activeAuctions.forEach(item => { if (item.timeLeft > 0) item.timeLeft--; });
    }, 1000);
  }

  setupStorageWatcher() {
    this.storageCheckInterval = setInterval(() => this.refreshCountryAndData(), 1000);
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
    clearInterval(this.storageCheckInterval);
  }

  onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.newAuctionObj.img = reader.result as string; // للمعاينة الفورية
    };
    reader.readAsDataURL(file);
  }
}


  loadMore() {

    this.itemsToShow += 4;
  }

}

