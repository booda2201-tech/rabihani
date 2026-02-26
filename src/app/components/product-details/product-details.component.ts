import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss']
})
export class ProductDetailsComponent implements OnInit, OnDestroy {

  isAiBotActive = signal(true);
  timeLeft = signal({ hours: 0, minutes: 45, seconds: 12 });
  isAuctionPaused = signal(false);
  isEditModalOpen = signal(false);
  product = signal<any>(null);


  private timerInterval: any;


  currentProduct = { id: 0, name: '', price: 0, quantity: 0 };


  bidHistory = [
    { name: 'أحمد علي', amount: 12500, time: '10:45 AM', isAi: false },
    { name: 'البوت الذكي', amount: 12000, time: '10:40 AM', isAi: true },
    { name: 'سارة محمود', amount: 11500, time: '10:30 AM', isAi: false },
    { name: 'ياسين كريم', amount: 11000, time: '10:15 AM', isAi: false },
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {

    this.product.set({
      id: 1,
      name: 'MacBook Pro M3 Max',
      img: 'https://picsum.photos/id/0/600/400',
      currentBid: 12550,
      targetPrice: 15000,
      status: 'نشط',
      participants: 24,
      views: 1540,
      description: 'أحدث إصدار من ماك بوك برو بمعالج M3 Max القوي، ذاكرة 64 جيجابايت وسعة تخزين 2 تيرابايت.'
    });


    this.startTimer();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  goBack() {
    window.history.back();
  }

  openEditModal() {
    const p = this.product();
    this.currentProduct = {
      id: p.id,
      name: p.name,
      price: p.currentBid,
      quantity: 1
    };
    this.isEditModalOpen.set(true);
  }

  closeModal() {
    this.isEditModalOpen.set(false);
  }

  saveProduct() {
    this.product.update(prev => ({
      ...prev,
      name: this.currentProduct.name,
      currentBid: this.currentProduct.price
    }));
    this.closeModal();
  }

  toggleAuctionStatus() {
    this.isAuctionPaused.update(v => !v);

  }

  toggleAiBot() {
    this.isAiBotActive.update(v => !v);
  }



  getProgressPercentage(): number {
    if (!this.product() || !this.product().targetPrice) return 0;
    return Math.min(Math.round((this.product().currentBid / this.product().targetPrice) * 100), 100);
  }

  getRandomColor(name: string): string {
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  forceAiBid() {
    const current = this.product().currentBid;
    const newBid = current + 50;

    this.product.update(p => ({...p, currentBid: newBid}));


    const now = new Date();
    const timeString = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');

    const newBidObj = {
      name: 'البوت الذكي',
      amount: 50,
      time: timeString,
      isAi: true
    };


    this.bidHistory = [newBidObj, ...this.bidHistory];
  }



  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {

      if (!this.isAuctionPaused()) {
        this.updateTime();
      }
    }, 1000);
  }

  updateTime() {
    const current = this.timeLeft();
    let { hours, minutes, seconds } = current;

    if (seconds > 0) {
      seconds--;
    } else {
      if (minutes > 0) {
        minutes--;
        seconds = 59;
      } else {
        if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          this.isAuctionPaused.set(true);
          clearInterval(this.timerInterval);
        }
      }
    }

    this.timeLeft.set({ hours, minutes, seconds });
  }
}
