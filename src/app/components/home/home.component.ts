


import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ElementRef, HostListener } from '@angular/core';
import { ApiService } from '../../Services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private el = inject(ElementRef);

  // مصفوفات البيانات
  allAuctionsRaw: any[] = [];
  activeAuctions: any[] = [];
  allProducts: any[] = [];

  // التحكم في العرض
  itemsToShow: number = 4;
  selectedCountry: any = { name: '...', id: null };
  searchTerm: string = '';
  showDropdown: boolean = false;
  showAddModal: boolean = false;
  isEditMode: boolean = false;

  // كائن المزاد الجديد / التعديل
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

  selectedFile: File | null = null;
  private timerInterval: any;
  private storageInterval: any;

  ngOnInit(): void {
    this.refreshCountryAndData();
    this.loadAllProducts();

    // مراقبة تغيير الدولة وتحديث العدادات
    this.storageInterval = setInterval(() => this.refreshCountryAndData(), 2000);
    this.timerInterval = setInterval(() => {
      this.updateActiveAuctions();
    }, 1000);
  }

  // --- إدارة البيانات والفلترة ---

  loadData() {
    this.apiService.getAuctionRooms().subscribe({
      next: (res: any) => {
        this.allAuctionsRaw = Array.isArray(res) ? res : (res.data || []);
        this.updateActiveAuctions();
      }
    });
  }

updateActiveAuctions() {
  if (!this.allAuctionsRaw.length || !this.selectedCountry?.id) return;

  const now = new Date().getTime(); // توحيد استخدام الـ Timestamp
  const buffer = 5000;
  this.activeAuctions = this.allAuctionsRaw
    .filter((a: any) => {
      const startTime = new Date(a.startTime).getTime();
      const endTime = new Date(a.endTime).getTime();
      const currentPoints = a.currentHighestBid || a.startPoints || 0;
      const targetPoints = a.limited || 0;

      // الشروط:
      const isSameCountry = a.countryId === this.selectedCountry.id;
      const isStarted = (now + buffer) >= startTime;
      const isNotEnded = now < (endTime + buffer);
      const isTargetNotReached = targetPoints === 0 || currentPoints < targetPoints;

      // المزاد نشط فقط إذا تحقق شرط الدولة + (بدأ ولم ينتهِ وقتياً) + (لم يصل للمستهدف)
      return isSameCountry &&
              (a.status === 1 || (a.status === 0 && isStarted)) &&
              isNotEnded &&
              isTargetNotReached;
    })
    .map(a => this.mapToUI(a));

  this.cdr.detectChanges();
}

private mapToUI(item: any) {
  const endTime = new Date(item.endTime).getTime();
  const now = new Date().getTime();

  return {
    ...item,
    name: item.name || item.roomName,
    officialPrice: item.product?.price || 0,
    currency: item.product?.currency || this.selectedCountry?.currency || 'نقطة',
    img: item.img || item.product?.imageUrl || 'assets/images/placeholder.png',
    startPrice: item.startPoints || 0,
    targetPrice: item.limited || 0,
    totalPoints: item.currentHighestBid || item.startPoints || 0,
    // استخدام نفس الحسبة للوقت المتبقي
    timeLeft: Math.max(0, Math.floor((endTime - now) / 1000)),
    lastBidder: {
      name: item.highestBidderName || 'لا يوجد مزايد'
    }
  };
}

  // --- إدارة المودال (إضافة/تعديل) ---

  openAddModal() {
    this.isEditMode = false;
    this.resetForm();
    this.showAddModal = true;
  }

  openEditModal(item: any) {
    this.isEditMode = true;
    this.newAuctionObj = {
      id: item.id,
      name: item.name,
      productId: item.productId || item.product?.id,
      startPoints: item.startPrice,
      targetPoints: item.targetPrice,
      startTime: this.formatDateForInput(item.startTime),
      endTime: this.formatDateForInput(item.endTime),
      img: item.img
    };
    this.searchTerm = item.name;
    this.showAddModal = true;
  }

submitNewAuction() {
  // دالة لتحويل قيمة الـ input المحلية إلى تاريخ ISO صحيح
  const toISODate = (localDateStr: string) => {
    if (!localDateStr) return null;
    return new Date(localDateStr).toISOString();
  };

  const payload = {
    roomName: this.newAuctionObj.name,
    productId: this.newAuctionObj.productId,
    startPoints: Number(this.newAuctionObj.startPoints),
    // تحويل الوقت المختار إلى ISO قبل الإرسال
    startTime: toISODate(this.newAuctionObj.startTime),
    endTime: toISODate(this.newAuctionObj.endTime),
    limited: Number(this.newAuctionObj.targetPoints),
    countryId: this.selectedCountry.id
  };

  const request = this.isEditMode
    ? this.apiService.updateAuctionRoom(this.newAuctionObj.id, payload)
    : this.apiService.postAuction(payload);

  request.subscribe({
    next: () => {
      this.loadData();
      this.closeModal();
      alert('تم حفظ المزاد بنجاح');
    },
    error: (err) => alert('خطأ في الإرسال: تأكد من صحة البيانات أو الوقت')
  });
}

  // --- دوال مساعدة (Helper Functions) ---

  getTimeParts(totalSeconds: number) {
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { d, h: this.pad(h), m: this.pad(m), s: this.pad(s) };
  }

  private pad(n: number) { return n < 10 ? '0' + n : n; }

  loadMore() { this.itemsToShow += 4; }

get minDateTime() {
  const now = new Date();
  const tzoffset = now.getTimezoneOffset() * 60000;
  return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
}

private formatDateForInput(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  const hours = ('0' + date.getHours()).slice(-2);
  const minutes = ('0' + date.getMinutes()).slice(-2);
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

  loadAllProducts() {
    this.apiService.getProducts().subscribe(res => this.allProducts = res || []);
  }

  filteredProducts() {
    return this.allProducts.filter(p => p.name.toLowerCase().includes(this.searchTerm.toLowerCase()));
  }

  selectProduct(prod: any) {
    this.newAuctionObj.productId = prod.id;
    this.newAuctionObj.name = prod.name;
    this.newAuctionObj.img = prod.imageUrl;
    this.searchTerm = prod.name;
    this.showDropdown = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.newAuctionObj.img = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  closeModal() { this.showAddModal = false; this.resetForm(); }

  resetForm() {
    this.newAuctionObj = { id: null, name: '', productId: null, startPoints: 0, targetPoints: 0, startTime: '', endTime: '', img: '' };
    this.searchTerm = '';
    this.selectedFile = null;
  }

  private refreshCountryAndData() {
    const data = localStorage.getItem('selected_country');
    if (data) {
      const country = JSON.parse(data);
      if (this.selectedCountry.id !== country.id) {
        this.selectedCountry = country;
        this.loadData();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) this.showDropdown = false;
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
    clearInterval(this.storageInterval);
  }
}
