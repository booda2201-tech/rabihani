import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { ApiService } from '../../Services/api.service';

type AuctionKind = 'live' | 'soon' | 'won' | 'ended' | 'muted';

@Component({
  selector: 'app-company-profile',
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.scss']
})
export class CompanyProfileComponent implements OnInit, OnDestroy {
  company: any = null;
  countryName = '';
  isLoading = true;
  notFound = false;
  activeTab: 'entered' | 'won' = 'entered';

  private enteredAuctions: any[] = [];
  private wonAuctions: any[] = [];
  private liveCount = 0;
  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) {
        this.notFound = true;
        this.isLoading = false;
        return;
      }
      this.load(id);
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  get visibleAuctions() {
    return this.activeTab === 'won' ? this.wonAuctions : this.enteredAuctions;
  }

  get stats() {
    return [
      { label: 'منتجات في المزادات', value: this.enteredAuctions.length, icon: 'bi-box-seam' },
      { label: 'منتجات اتكسبت', value: this.wonAuctions.length, icon: 'bi-trophy-fill' },
      { label: 'مزاد مباشر الآن', value: this.liveCount, icon: 'bi-broadcast' }
    ];
  }

  get links() {
    const company = this.company || {};
    return [
      { url: company.websiteUrl, label: 'الموقع', icon: 'bi-globe2' },
      { url: company.facebookUrl, label: 'فيسبوك', icon: 'bi-facebook' },
      { url: company.instagramUrl, label: 'إنستجرام', icon: 'bi-instagram' },
      { url: company.tikTokUrl, label: 'تيك توك', icon: 'bi-tiktok' },
      { url: company.googlePlayUrl, label: 'Google Play', icon: 'bi-google-play' },
      { url: company.appStoreUrl, label: 'App Store', icon: 'bi-apple' }
    ].filter(link => !!link.url);
  }

  goBack() {
    this.router.navigate(['/comp']);
  }

  auctionState(auction: any): { label: string; kind: AuctionKind } {
    if (auction?.isCancelled) return { label: 'ملغي', kind: 'muted' };
    if (auction?.winner) return { label: 'اتكسب', kind: 'won' };
    const now = Date.now();
    const start = new Date(auction.startTime).getTime();
    const end = new Date(auction.endTime).getTime();
    if (now < start) return { label: 'قريباً', kind: 'soon' };
    if (now >= start && now < end && auction.status !== 2) return { label: 'مباشر', kind: 'live' };
    return { label: 'منتهي', kind: 'ended' };
  }

  formatDate(value: string) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  private load(id: number) {
    this.isLoading = true;
    this.notFound = false;
    forkJoin({
      company: this.apiService.getCompanyById(id),
      auctions: this.apiService.getAuctionRooms(),
      countries: this.apiService.getCountries()
    }).subscribe({
      next: ({ company, auctions, countries }) => {
        const record = company?.id ? company : company?.data;
        if (!record?.id) {
          this.notFound = true;
          this.isLoading = false;
          return;
        }
        this.company = record;
        const country = (countries || []).find((item: any) => String(item.id) === String(record.countryId));
        this.countryName = country?.name || record.countryName || '';
        this.splitAuctions(Array.isArray(auctions) ? auctions : (auctions?.data || []), record);
        this.isLoading = false;
      },
      error: () => {
        this.notFound = true;
        this.isLoading = false;
      }
    });
  }

  private splitAuctions(auctions: any[], company: any) {
    const ownIds = new Set((company.auctions || []).map((auction: any) => String(auction.id)));
    const entered = auctions.filter(auction =>
      String(auction.companyId) === String(company.id) || ownIds.has(String(auction.id))
    );
    const rank: Record<AuctionKind, number> = { live: 0, soon: 1, won: 2, ended: 3, muted: 4 };
    entered.sort((a, b) => rank[this.auctionState(a).kind] - rank[this.auctionState(b).kind]);
    this.enteredAuctions = entered;
    this.wonAuctions = entered.filter(auction => !!auction.winner);
    this.liveCount = entered.filter(auction => this.auctionState(auction).kind === 'live').length;
  }
}
