



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
  if (!country || !country.id || !this.allAuctions.length) return;

  const countryId = country.id;
  const now = new Date().getTime(); // الوقت الحالي بالملي ثانية

  // 1. المزادات النشطة
  this.activeAuctionsList = this.allAuctions
    .filter(a => {
      const startTime = new Date(a.startTime).getTime();
      const endTime = new Date(a.endTime).getTime();
      const currentPoints = a.currentHighestBid || a.startPoints || 0;
      const targetPoints = a.limited || 0;

      const isStarted = now >= startTime;
      const isNotEnded = now < endTime;
      const isTargetNotReached = targetPoints === 0 || currentPoints < targetPoints;

      return a.countryId === countryId &&
              (a.status === 1 || (a.status === 0 && isStarted)) &&
              isNotEnded &&
              isTargetNotReached; // يختفي من النشطة لو وصل للمستهدف
    })
    .map(a => this.mapToUI(a));

  // 2. المزادات القادمة
  this.upcomingAuctionsList = this.allAuctions
    .filter(a => {
      const startTime = new Date(a.startTime).getTime();
      return a.countryId === countryId && a.status === 0 && now < startTime;
    })
    .map(a => this.mapToUI(a));

  // 3. المزادات المنتهية
  this.finishedAuctionsList = this.allAuctions
    .filter(a => {
      const endTime = new Date(a.endTime).getTime();
      const currentPoints = a.currentHighestBid || a.startPoints || 0;
      const targetPoints = a.limited || 0;

      const isTimeOver = now >= endTime;
      const isTargetReached = targetPoints > 0 && currentPoints >= targetPoints;

      return a.countryId === countryId && (a.status === 2 || isTimeOver || isTargetReached);
    })
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
    startTime: this.selectedAuction.startTime,
    endTime: this.selectedAuction.endTime,
    limited: Number(this.selectedAuction.targetPoints),
    countryId: this.selectedAuction.countryId
  };

  this.apiService.updateAuctionRoom(this.selectedAuction.id, payload).subscribe({
    next: (res) => {
      this.loadData();
      this.closeModal();
      alert('تم تحديث المزاد بنجاح');
    },
    error: (err) => alert('خطأ في التحديث'),
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
  const end = new Date(endTime).getTime();
  const now = new Date().getTime();
  const diff = Math.floor((end - now) / 1000);
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




