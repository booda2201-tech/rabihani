


import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../Services/api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss']
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product = signal<any>(null);
  timeLeft = signal({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // isAiBotActive = signal(true);
  isAuctionPaused = signal(false);
  private timerInterval: any;
  private routeSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.routeSub = this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadAuctionDetails(id);
      }
    });
  }

  loadAuctionDetails(id: number) {
    this.apiService.getAuctionRoomById(id).subscribe({
      next: (data) => {
        this.product.set(data);
        this.isAuctionPaused.set(data.isCancelled);
        this.startTimer(data.endTime);
      },
      error: (err) => console.error('Error fetching data:', err)
    });
  }

startTimer(endTimeStr: string) {
  if (this.timerInterval) clearInterval(this.timerInterval);
  const endTime = new Date(endTimeStr).getTime();

  this.timerInterval = setInterval(() => {
    if (!this.isAuctionPaused()) {
      const now = new Date().getTime();
      const distanceMs = endTime - now;
      const totalSeconds = Math.floor(distanceMs / 1000);

      if (totalSeconds <= 0) {
        this.timeLeft.set({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(this.timerInterval);
        return;
      }

      // حساب الأجزاء بناءً على الثواني
      this.timeLeft.set({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: Math.floor(totalSeconds % 60)
      });
    }
  }, 1000);
}

  getRandomColor(name: string): string {
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  goBack() { window.history.back(); }
  toggleAuctionStatus() { this.isAuctionPaused.update(v => !v); }
  // toggleAiBot() { this.isAiBotActive.update(v => !v); }
}
